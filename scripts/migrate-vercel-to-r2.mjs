/**
 * Vercel Blob → Cloudflare R2 画像移行スクリプト (STEP 6)
 *
 * 実行前提:
 *   - scripts/r2-test.mjs で R2 接続テスト済み
 *   - 本番 DB に接続できること
 *
 * 環境変数:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME=comiu-images
 *   NEXT_PUBLIC_R2_PUBLIC_URL=https://images.comiu.link
 *   DATABASE_URL=postgresql://...  (本番DB, 読み取り専用で使用)
 *
 * モード:
 *   --dry-run   : コピーせず URL 一覧のみ出力 (デフォルト)
 *   --copy      : 実際にコピーを実行 (要承認後に実行)
 *   --verify    : コピー済みオブジェクトを検証
 *
 * 使用方法:
 *   node scripts/migrate-vercel-to-r2.mjs --dry-run
 *   node scripts/migrate-vercel-to-r2.mjs --copy      # 承認後
 *   node scripts/migrate-vercel-to-r2.mjs --verify    # 承認後
 */

// @aws-sdk/client-s3 は frontend/node_modules に存在するため、
// このスクリプトは frontend/ ディレクトリから実行してください:
//   cd frontend && node ../scripts/migrate-vercel-to-r2.mjs --dry-run
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--copy');
const isVerify = process.argv.includes('--verify');

function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`ERROR: ${name} が未設定です`); process.exit(1); }
  return v;
}

const accountId   = requireEnv('R2_ACCOUNT_ID');
const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
const secretKey   = requireEnv('R2_SECRET_ACCESS_KEY');
const bucket      = requireEnv('R2_BUCKET_NAME');
const publicUrl   = requireEnv('NEXT_PUBLIC_R2_PUBLIC_URL').replace(/\/$/, '');
const dbUrl       = process.env.DATABASE_URL;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey: secretKey },
});

// --- Vercel Blob URL からパスを抽出 ---
function extractVercelPath(url) {
  // https://pc2eyeqk22ch6su6.public.blob.vercel-storage.com/events/xxx.png
  //  → events/xxx.png
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

// --- DB から全画像 URL を取得 ---
async function fetchImageUrlsFromDb() {
  if (!dbUrl) {
    console.warn('DATABASE_URL が未設定のため、バックアップファイルから URL を使用します');
    return null;
  }
  // pg を dynamic import (存在する場合のみ)
  try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();
    const result = await client.query(`
      SELECT
        t.id AS tenant_id, t.name, t.code,
        t.icon_url,
        pp.header_image_url,
        pp.logo_url
      FROM tenants t
      LEFT JOIN public_pages pp ON pp.tenant_id = t.id
      WHERE t.icon_url LIKE '%blob.vercel-storage.com%'
         OR pp.header_image_url LIKE '%blob.vercel-storage.com%'
         OR pp.logo_url LIKE '%blob.vercel-storage.com%'
    `);
    await client.end();
    return result.rows;
  } catch (e) {
    console.warn('DB 接続エラー:', e.message);
    return null;
  }
}

// --- フォールバック: バックアップ JSON から URL 収集 ---
async function fetchImageUrlsFromBackup() {
  const { default: fs } = await import('fs');
  const backupPath = new URL('../backup_20260519.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  try {
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const urls = new Set();
    function scan(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const v of Object.values(obj)) {
        if (typeof v === 'string' && v.includes('blob.vercel-storage.com')) urls.add(v);
        else if (typeof v === 'object') scan(v);
      }
    }
    scan(data);
    return [...urls].map(url => ({ url, source: 'backup' }));
  } catch (e) {
    console.error('バックアップ読み込みエラー:', e.message);
    return [];
  }
}

// --- URL 一覧を収集 ---
async function collectUrls() {
  const dbRows = await fetchImageUrlsFromDb();
  if (dbRows) {
    const urls = [];
    for (const row of dbRows) {
      if (row.icon_url) urls.push({ url: row.icon_url, tenant: row.name, field: 'icon_url' });
      if (row.header_image_url) urls.push({ url: row.header_image_url, tenant: row.name, field: 'header_image_url' });
      if (row.logo_url) urls.push({ url: row.logo_url, tenant: row.name, field: 'logo_url' });
    }
    return urls;
  }
  return await fetchImageUrlsFromBackup();
}

// --- Vercel Blob URL を R2 URL に変換 ---
function toR2Url(vercelUrl) {
  const path = extractVercelPath(vercelUrl);
  if (!path) return null;
  return `${publicUrl}/${path}`;
}

// --- 画像をコピー ---
async function copyImage(item) {
  const path = extractVercelPath(item.url);
  if (!path) return { ...item, status: 'skip', reason: 'URL parse error' };

  // 元画像をダウンロード
  let res;
  try {
    res = await fetch(item.url);
    if (!res.ok) return { ...item, status: 'fail', reason: `HTTP ${res.status}` };
  } catch (e) {
    return { ...item, status: 'fail', reason: e.message };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const md5 = crypto.createHash('md5').update(buffer).digest('hex');

  // R2 にアップロード
  try {
    await r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: buffer,
      ContentType: contentType,
      Metadata: { 'source-url': item.url, 'md5': md5 },
    }));
    return {
      ...item,
      status: 'copied',
      path,
      r2Url: `${publicUrl}/${path}`,
      bytes: buffer.length,
      contentType,
      md5,
    };
  } catch (e) {
    return { ...item, status: 'fail', reason: e.message };
  }
}

// --- コピー済みを検証 ---
async function verifyImage(item) {
  const path = extractVercelPath(item.url);
  if (!path) return { ...item, status: 'skip' };
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: path }));
    // 公開URLで取得確認
    const r2Url = `${publicUrl}/${path}`;
    const res = await fetch(r2Url);
    return {
      ...item,
      path,
      r2Url,
      r2Exists: true,
      r2Size: head.ContentLength,
      r2ContentType: head.ContentType,
      publicOk: res.ok,
      publicStatus: res.status,
    };
  } catch (e) {
    return { ...item, path, r2Exists: false, reason: e.message };
  }
}

// --- メイン ---
async function main() {
  console.log(`=== Vercel Blob → R2 移行スクリプト (モード: ${isDryRun ? 'dry-run' : isVerify ? 'verify' : 'copy'}) ===\n`);

  const items = await collectUrls();
  const vercelItems = items.filter(i => (i.url ?? i).toString().includes('blob.vercel-storage.com'));
  console.log(`対象 Vercel Blob 画像: ${vercelItems.length} 件\n`);

  for (const item of vercelItems) {
    const url = item.url ?? item;
    console.log(`  URL: ${url}`);
    if (item.tenant) console.log(`       tenant=${item.tenant} field=${item.field}`);
    console.log(`  R2:  ${toR2Url(url) ?? '(変換不可)'}\n`);
  }

  if (isDryRun) {
    console.log('--- dry-run モード: 実際のコピーは行いません ---');
    console.log('実行するには: node scripts/migrate-vercel-to-r2.mjs --copy');
    return;
  }

  if (isVerify) {
    console.log('--- verify モード: R2 上のオブジェクトを検証 ---\n');
    for (const item of vercelItems) {
      const r = await verifyImage({ ...item, url: item.url ?? item });
      const icon = r.publicOk ? '✅' : r.r2Exists ? '⚠️' : '❌';
      console.log(`${icon} ${r.path ?? r.url}`);
      if (r.r2Exists) console.log(`   R2サイズ: ${r.r2Size} bytes | 公開URL: ${r.publicStatus}`);
      else console.log(`   R2に存在しない: ${r.reason}`);
    }
    return;
  }

  // --copy モード
  console.log('--- copy モード: Vercel Blob → R2 コピー実行 ---\n');
  const results = [];
  for (const item of vercelItems) {
    process.stdout.write(`コピー中: ${item.url ?? item} ... `);
    const r = await copyImage({ ...item, url: item.url ?? item });
    console.log(r.status === 'copied' ? `✅ ${r.bytes} bytes` : `❌ ${r.reason}`);
    results.push(r);
  }

  const copied = results.filter(r => r.status === 'copied').length;
  const failed = results.filter(r => r.status === 'fail').length;
  console.log(`\n=== 完了: ${copied} 件コピー / ${failed} 件失敗 ===`);

  if (copied > 0) {
    console.log('\n--- R2 URL 対応表 (DB更新用) ---');
    for (const r of results.filter(r => r.status === 'copied')) {
      console.log(`  旧: ${r.url}`);
      console.log(`  新: ${r.r2Url}`);
      if (r.tenant) console.log(`  tenant=${r.tenant} field=${r.field}`);
      console.log('');
    }
  }

  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
