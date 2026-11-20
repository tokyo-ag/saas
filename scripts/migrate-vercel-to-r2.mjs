/**
 * Vercel Blob → Cloudflare R2 画像移行スクリプト v2 (STEP 6)
 *
 * 対応テーブル・カラム:
 *   events.image_url
 *   public_pages.cover_image_url / image_urls / org_logo_wordmark_url / og_image_url / blocks[].imageUrl
 *   tenants.icon_url
 *   official_articles.og_image_url
 *   blog_posts.body (Markdown埋め込み・将来対応)
 *
 * 環境変数:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME=comiu-images
 *   NEXT_PUBLIC_R2_PUBLIC_URL=https://images.comiu.link
 *   DATABASE_URL=postgresql://...
 *
 * モード:
 *   --dry-run    : デフォルト。URL一覧・変換対象のみ出力
 *   --copy       : Vercel Blob → R2 コピー（R2認証情報必須）
 *   --verify     : コピー済みオブジェクトのハッシュ・サイズ照合
 *   --update-db  : --verify 全件PASS後にDB URLを更新（DATABASE_URL必須、R2認証不要）
 *   --rollback   : rollback_snapshot.jsonlからDB URLを旧URLに戻す（DATABASE_URL必須、R2認証不要）
 *   --force      : --copy 時に既存R2オブジェクトを上書き
 *
 * 使用方法:
 *   node scripts/migrate-vercel-to-r2.mjs --dry-run
 *   node scripts/migrate-vercel-to-r2.mjs --copy       # 承認後
 *   node scripts/migrate-vercel-to-r2.mjs --verify     # コピー後
 *   node scripts/migrate-vercel-to-r2.mjs --update-db  # verify全件PASS後のみ
 *   node scripts/migrate-vercel-to-r2.mjs --rollback   # 緊急時のみ
 *
 * frontend/ ディレクトリから実行してください。
 */

import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- モード判定 ---
const args = process.argv.slice(2);
const isCopy     = args.includes('--copy');
const isVerify   = args.includes('--verify');
const isUpdateDb = args.includes('--update-db');
const isRollback = args.includes('--rollback');
const isForce    = args.includes('--force');
const isDryRun   = !isCopy && !isVerify && !isUpdateDb && !isRollback;

const LOG_FILE = path.join(__dirname, '..', 'migration_log.jsonl');

// --- 環境変数ヘルパー ---
function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`ERROR: ${name} が未設定です`); process.exit(1); }
  return v;
}
function optEnv(name) { return process.env[name] ?? null; }

// --- R2クライアント ---
function getR2Client() {
  const accountId      = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId    = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// --- DB接続 ---
async function getDbClient() {
  const dbUrl = requireEnv('DATABASE_URL');
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  await client.query("SET statement_timeout = '30s'");
  return client;
}

// --- ユーティリティ ---
function extractVercelPath(url) {
  try { return new URL(url).pathname.replace(/^\//, ''); }
  catch { return null; }
}

function md5hex(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

function sha256hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function isHeic(url) {
  return /\.heic$/i.test(url);
}

async function convertHeicToJpeg(buffer, originalKey) {
  const { default: sharp } = await import('sharp');
  const jpegBuffer = await sharp(buffer)
    .rotate()
    .jpeg({ quality: 90, mozjpeg: false })
    .toBuffer();
  const newKey = originalKey.replace(/\.heic$/i, '.jpg');
  return { buffer: jpegBuffer, key: newKey, contentType: 'image/jpeg', converted: true };
}

function appendLog(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
}

// --- DBから全Vercel Blob URLを収集 ---
async function collectUrlsFromDb(client) {
  const items = [];

  // テーブル存在確認ヘルパー
  async function tableExists(name) {
    const r = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`,
      [name]
    );
    return r.rows[0].exists;
  }

  // 1. events.image_url
  {
    const r = await client.query(`
      SELECT e.id AS record_id, e.title AS label, e.image_url AS url,
             t.name AS tenant, 'events' AS table_name, 'image_url' AS column_name,
             NULL::int AS array_index, NULL::text AS jsonb_path
      FROM events e JOIN tenants t ON t.id = e.tenant_id
      WHERE e.image_url LIKE '%blob.vercel-storage.com%'
      ORDER BY e.id
    `);
    items.push(...r.rows);
  }

  // 2. public_pages スカラーカラム
  if (await tableExists('public_pages')) {
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='public_pages'
        AND column_name IN ('cover_image_url','org_logo_wordmark_url','og_image_url')
    `);
    const existing = cols.rows.map(r => r.column_name);
    if (existing.length > 0) {
      const vals = existing.map(c => `('${c}', pp.${c})`).join(',\n    ');
      const r = await client.query(`
        SELECT pp.id AS record_id, t.name AS label,
               v.col_name AS column_name, v.url_val AS url,
               t.name AS tenant, 'public_pages' AS table_name,
               NULL::int AS array_index, NULL::text AS jsonb_path
        FROM public_pages pp JOIN tenants t ON t.id = pp.tenant_id,
        LATERAL (VALUES ${vals}) AS v(col_name, url_val)
        WHERE v.url_val LIKE '%blob.vercel-storage.com%'
        ORDER BY pp.id, v.col_name
      `);
      items.push(...r.rows);
    }

    // 3. public_pages.image_urls (TEXT[])
    const hasImageUrls = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='public_pages' AND column_name='image_urls')`
    );
    if (hasImageUrls.rows[0].exists) {
      const r = await client.query(`
        SELECT pp.id AS record_id, t.name AS label,
               'image_urls' AS column_name, u AS url,
               t.name AS tenant, 'public_pages' AS table_name,
               (idx - 1)::int AS array_index, NULL::text AS jsonb_path
        FROM public_pages pp JOIN tenants t ON t.id = pp.tenant_id,
        LATERAL unnest(pp.image_urls) WITH ORDINALITY AS t2(u, idx)
        WHERE u LIKE '%blob.vercel-storage.com%'
        ORDER BY pp.id, idx
      `);
      items.push(...r.rows);
    }

    // 4. public_pages.blocks (JSONB)
    const hasBlocks = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='public_pages' AND column_name='blocks')`
    );
    if (hasBlocks.rows[0].exists) {
      const r = await client.query(`
        SELECT pp.id AS record_id, t.name AS label,
               'blocks' AS column_name,
               (blk->>'imageUrl') AS url,
               t.name AS tenant, 'public_pages' AS table_name,
               NULL::int AS array_index,
               ('blocks[' || (idx - 1) || '].imageUrl') AS jsonb_path
        FROM public_pages pp JOIN tenants t ON t.id = pp.tenant_id,
        LATERAL jsonb_array_elements(
          CASE jsonb_typeof(pp.blocks) WHEN 'array' THEN pp.blocks ELSE '[]'::jsonb END
        ) WITH ORDINALITY AS t2(blk, idx)
        WHERE (blk->>'imageUrl') LIKE '%blob.vercel-storage.com%'
        ORDER BY pp.id, idx
      `);
      items.push(...r.rows);
    }
  }

  // 5. tenants.icon_url
  {
    const hasCol = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='icon_url')`
    );
    if (hasCol.rows[0].exists) {
      const r = await client.query(`
        SELECT id AS record_id, name AS label, icon_url AS url,
               name AS tenant, 'tenants' AS table_name,
               'icon_url' AS column_name, NULL::int AS array_index, NULL::text AS jsonb_path
        FROM tenants
        WHERE icon_url LIKE '%blob.vercel-storage.com%'
        ORDER BY id
      `);
      items.push(...r.rows);
    }
  }

  // 6. official_articles.og_image_url
  if (await tableExists('official_articles')) {
    const r = await client.query(`
      SELECT id AS record_id, title AS label, og_image_url AS url,
             'COMIU公式' AS tenant, 'official_articles' AS table_name,
             'og_image_url' AS column_name, NULL::int AS array_index, NULL::text AS jsonb_path
      FROM official_articles
      WHERE og_image_url LIKE '%blob.vercel-storage.com%'
      ORDER BY id
    `);
    items.push(...r.rows);
  }

  // 7. blog_posts.body (Markdown埋め込み)
  if (await tableExists('blog_posts')) {
    const r = await client.query(`
      SELECT bp.id AS record_id, bp.title AS label,
             m[1] AS url,
             t.name AS tenant, 'blog_posts' AS table_name,
             'body' AS column_name, NULL::int AS array_index,
             'markdown_embed' AS jsonb_path
      FROM blog_posts bp JOIN tenants t ON t.id = bp.tenant_id,
      LATERAL regexp_matches(bp.body, 'https://[^\\s"\\)]+blob\\.vercel-storage\\.com[^\\s"\\)]*', 'g') AS m
      WHERE bp.body LIKE '%blob.vercel-storage.com%'
      ORDER BY bp.id
    `);
    items.push(...r.rows);
  }

  return items;
}

// --- ユニークURLにまとめる ---
function deduplicateByUrl(items) {
  const map = new Map();
  for (const item of items) {
    if (!item.url) continue;
    if (!map.has(item.url)) {
      map.set(item.url, { ...item, refs: [] });
    }
    map.get(item.url).refs.push({
      table: item.table_name,
      column: item.column_name,
      record_id: item.record_id,
      tenant: item.tenant,
      array_index: item.array_index,
      jsonb_path: item.jsonb_path,
    });
  }
  return [...map.values()];
}

// --- R2パス計算（HEIC→.jpgキー変換含む） ---
function computeR2Key(vercelUrl) {
  const path = extractVercelPath(vercelUrl);
  if (!path) return null;
  if (isHeic(vercelUrl)) return path.replace(/\.heic$/i, '.jpg');
  return path;
}

// --- --copy モード ---
async function runCopy(items, r2, bucket, publicUrl) {
  console.log(`\n--- copy モード: ${items.length} ユニークURL ---\n`);
  let copied = 0, skipped = 0, failed = 0;

  for (const item of items) {
    const vercelKey = extractVercelPath(item.url);
    const r2Key = computeR2Key(item.url);
    if (!vercelKey || !r2Key) {
      console.log(`⚠️  スキップ（URL解析失敗）: ${item.url}`);
      failed++;
      continue;
    }

    // べき等性：既存チェック
    if (!isForce) {
      try {
        await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: r2Key }));
        console.log(`⏭  既存スキップ: ${r2Key}`);
        skipped++;
        continue;
      } catch { /* 存在しない → コピー */ }
    }

    // Vercel Blobからダウンロード
    let res;
    try {
      res = await fetch(item.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.log(`❌ DL失敗: ${item.url} - ${e.message}`);
      appendLog({ ts: new Date().toISOString(), status: 'fail', reason: e.message, vercel_url: item.url, r2_key: r2Key });
      failed++;
      continue;
    }

    let buffer = Buffer.from(await res.arrayBuffer());
    let contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    let finalKey = r2Key;
    let converted = false;

    // HEIC変換
    if (isHeic(item.url)) {
      try {
        const result = await convertHeicToJpeg(buffer, vercelKey);
        buffer = result.buffer;
        contentType = result.contentType;
        finalKey = result.key;
        converted = true;
        console.log(`🔄 HEIC→JPEG変換: ${vercelKey} → ${finalKey} (${buffer.length} bytes)`);
      } catch (e) {
        console.log(`❌ HEIC変換失敗: ${item.url} - ${e.message}`);
        appendLog({ ts: new Date().toISOString(), status: 'heic_fail', reason: e.message, vercel_url: item.url });
        failed++;
        continue;
      }
    }

    const md5 = md5hex(buffer);
    const sha256 = sha256hex(buffer);
    const r2Url = `${publicUrl.replace(/\/$/, '')}/${finalKey}`;

    // R2アップロード
    try {
      await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          'source-url': item.url,
          'md5': md5,
          'sha256': sha256,
          'converted-from-heic': converted ? 'true' : 'false',
        },
      }));

      const logEntry = {
        ts: new Date().toISOString(),
        status: 'copied',
        vercel_url: item.url,
        r2_key: finalKey,
        r2_url: r2Url,
        bytes: buffer.length,
        content_type: contentType,
        md5,
        sha256,
        converted,
        refs: item.refs,
      };
      appendLog(logEntry);

      console.log(`✅ ${finalKey} (${buffer.length} bytes${converted ? ' HEIC→JPEG' : ''})`);
      copied++;
    } catch (e) {
      console.log(`❌ R2アップロード失敗: ${finalKey} - ${e.message}`);
      appendLog({ ts: new Date().toISOString(), status: 'fail', reason: e.message, vercel_url: item.url, r2_key: finalKey });
      failed++;
    }
  }

  console.log(`\n=== copy完了: ${copied}件コピー / ${skipped}件スキップ / ${failed}件失敗 ===`);
  if (failed > 0) process.exit(1);
}

// --- --verify モード ---
async function runVerify(items, r2, bucket, publicUrl) {
  console.log(`\n--- verify モード ---\n`);

  // migration_log.jsonl を読み込んでハッシュ情報を取得
  const logMap = new Map();
  if (fs.existsSync(LOG_FILE)) {
    for (const line of fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean)) {
      try {
        const e = JSON.parse(line);
        if (e.status === 'copied') logMap.set(e.vercel_url, e);
      } catch {}
    }
  }

  let pass = 0, fail = 0;
  const failedItems = [];

  for (const item of items) {
    const r2Key = computeR2Key(item.url);
    if (!r2Key) { fail++; continue; }

    const r2Url = `${publicUrl.replace(/\/$/, '')}/${r2Key}`;
    const logEntry = logMap.get(item.url);

    try {
      // HeadObjectでR2存在確認
      const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: r2Key }));

      // 公開URL確認
      const pubRes = await fetch(r2Url, { method: 'HEAD' });

      // ハッシュ照合（logがある場合）
      let hashOk = true;
      if (logEntry) {
        // GetObjectでバイトを取得してハッシュ比較
        const obj = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: r2Key }));
        const chunks = [];
        for await (const chunk of obj.Body) chunks.push(chunk);
        const buf = Buffer.concat(chunks);
        const actualMd5 = md5hex(buf);
        hashOk = actualMd5 === logEntry.md5;
      }

      const ok = pubRes.ok && hashOk;
      const icon = ok ? '✅' : '⚠️';
      console.log(`${icon} ${r2Key} | R2:${head.ContentLength}bytes | pub:${pubRes.status} | hash:${hashOk ? 'OK' : 'MISMATCH'}`);

      if (ok) pass++;
      else { fail++; failedItems.push({ url: item.url, r2Key, pubStatus: pubRes.status, hashOk }); }
    } catch (e) {
      console.log(`❌ ${r2Key}: ${e.message}`);
      fail++;
      failedItems.push({ url: item.url, r2Key, error: e.message });
    }
  }

  console.log(`\n=== verify結果: ${pass} PASS / ${fail} FAIL ===`);

  if (fail > 0) {
    console.log('\n失敗一覧:');
    for (const f of failedItems) console.log(' ', JSON.stringify(f));
    console.log('\n--update-db は verify が全件PASS後のみ実行可能です。');
    process.exit(1);
  } else {
    console.log('✅ 全件PASS。--update-db が実行可能です。');
    // PASSマーカーファイルを作成
    fs.writeFileSync(path.join(__dirname, '..', '.verify_passed'), new Date().toISOString(), 'utf8');
  }
}

// --- --update-db モード ---
async function runUpdateDb(items, dbClient, publicUrl) {
  console.log(`\n--- update-db モード ---\n`);

  // verify PASSマーカー確認
  const markerFile = path.join(__dirname, '..', '.verify_passed');
  if (!fs.existsSync(markerFile)) {
    console.error('ERROR: --verify が全件PASSしていません。先に --verify を実行してください。');
    process.exit(1);
  }

  // migration_log.jsonl からURL対応表を構築
  const urlMap = new Map(); // vercel_url → r2_url
  if (!fs.existsSync(LOG_FILE)) {
    console.error('ERROR: migration_log.jsonl が見つかりません。--copy を先に実行してください。');
    process.exit(1);
  }
  for (const line of fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean)) {
    try {
      const e = JSON.parse(line);
      if (e.status === 'copied') urlMap.set(e.vercel_url, e.r2_url);
    } catch {}
  }

  // 更新前に現在のDB値を再確認（調査時と変わっていないか）
  console.log('DBの現在値を再確認中...');
  const currentItems = await collectUrlsFromDb(dbClient);
  const currentUrls = new Set(currentItems.map(i => i.url).filter(Boolean));
  const expectedUrls = new Set(items.map(i => i.url).filter(Boolean));

  const newUrls = [...currentUrls].filter(u => !expectedUrls.has(u));
  const missingUrls = [...expectedUrls].filter(u => !currentUrls.has(u));

  if (newUrls.length > 0 || missingUrls.length > 0) {
    console.error('ERROR: 調査時からDBのURL状態が変化しています。安全のため処理を中断します。');
    if (newUrls.length > 0) console.error('  新規追加URL:', newUrls);
    if (missingUrls.length > 0) console.error('  消滅URL:', missingUrls);
    process.exit(1);
  }

  // --- ロールバック用スナップショットをBEGIN前に永続化 ---
  // COMMIT後にプロセスが異常終了しても旧URLへ確実に復元できるよう、
  // DB更新の開始前にスナップショットを書き込む。
  const rollbackFile = path.join(__dirname, '..', 'rollback_snapshot.jsonl');
  const existingSnapshotUrls = new Set();
  if (fs.existsSync(rollbackFile)) {
    for (const line of fs.readFileSync(rollbackFile, 'utf8').split('\n').filter(Boolean)) {
      try { const e = JSON.parse(line); if (e.vercel_url) existingSnapshotUrls.add(e.vercel_url); } catch {}
    }
  }
  for (const item of items) {
    if (item.url && !existingSnapshotUrls.has(item.url)) {
      fs.appendFileSync(rollbackFile,
        JSON.stringify({ vercel_url: item.url, r2_url: urlMap.get(item.url), refs: item.refs }) + '\n',
        'utf8'
      );
    }
  }

  // スナップショット完全性確認：全URLが記録されているか検証
  const snapshotUrls = new Set();
  for (const line of fs.readFileSync(rollbackFile, 'utf8').split('\n').filter(Boolean)) {
    try { const e = JSON.parse(line); if (e.vercel_url) snapshotUrls.add(e.vercel_url); } catch {}
  }
  const missingFromSnapshot = items.filter(i => i.url && !snapshotUrls.has(i.url));
  if (missingFromSnapshot.length > 0) {
    console.error(`ERROR: スナップショットに ${missingFromSnapshot.length} 件のURLが記録されていません。`);
    for (const m of missingFromSnapshot) console.error('  ', m.url);
    process.exit(1);
  }
  console.log(`✅ ロールバック用スナップショット: ${snapshotUrls.size}件記録済み\n`);

  // トランザクション内で更新
  await dbClient.query('BEGIN');
  let totalUpdated = 0;

  try {
    for (const item of items) {
      const oldUrl = item.url;
      const newUrl = urlMap.get(oldUrl);
      if (!oldUrl || !newUrl) continue;

      let result;
      // refs は deduplicateByUrl が {table, column, ...} で作成するため table/column を使う
      const { table: table_name, column: column_name, record_id, array_index } = item.refs[0];
      const ALLOWED_PP_COLS = ['cover_image_url', 'org_logo_wordmark_url', 'og_image_url'];

      if (table_name === 'events' && column_name === 'image_url') {
        result = await dbClient.query(
          `UPDATE events SET image_url = $1 WHERE image_url = $2`,
          [newUrl, oldUrl]
        );
      } else if (table_name === 'public_pages' && column_name === 'image_urls') {
        result = await dbClient.query(
          `UPDATE public_pages SET image_urls = array_replace(image_urls, $1::text, $2::text) WHERE $1 = ANY(image_urls)`,
          [oldUrl, newUrl]
        );
      } else if (table_name === 'public_pages' && column_name === 'blocks') {
        // JSOBブロックの imageUrl を置換（全ブロックをスキャン）
        result = await dbClient.query(`
          UPDATE public_pages
          SET blocks = (
            SELECT jsonb_agg(
              CASE WHEN blk->>'imageUrl' = $1
                   THEN jsonb_set(blk, '{imageUrl}', to_jsonb($2::text))
                   ELSE blk END
            )
            FROM jsonb_array_elements(CASE jsonb_typeof(blocks) WHEN 'array' THEN blocks ELSE '[]'::jsonb END) AS blk
          )
          WHERE blocks::text LIKE '%' || $1 || '%'
        `, [oldUrl, newUrl]);
      } else if (table_name === 'public_pages') {
        if (!ALLOWED_PP_COLS.includes(column_name)) {
          throw new Error(`不正なカラム名: ${column_name}（許可: ${ALLOWED_PP_COLS.join(', ')}）`);
        }
        result = await dbClient.query(
          `UPDATE public_pages SET ${column_name} = $1 WHERE ${column_name} = $2`,
          [newUrl, oldUrl]
        );
      } else if (table_name === 'tenants' && column_name === 'icon_url') {
        result = await dbClient.query(
          `UPDATE tenants SET icon_url = $1 WHERE icon_url = $2`,
          [newUrl, oldUrl]
        );
      } else if (table_name === 'official_articles') {
        result = await dbClient.query(
          `UPDATE official_articles SET og_image_url = $1 WHERE og_image_url = $2`,
          [newUrl, oldUrl]
        );
      } else if (table_name === 'blog_posts' && column_name === 'body') {
        result = await dbClient.query(
          `UPDATE blog_posts SET body = replace(body, $1, $2) WHERE body LIKE '%' || $1 || '%'`,
          [oldUrl, newUrl]
        );
      }

      if (result === undefined) {
        console.warn(`⚠️  未対応: ${table_name}.${column_name} - スキップ`);
      } else if (result.rowCount > 0) {
        console.log(`✅ ${table_name}.${column_name}: ${oldUrl.slice(-40)} → ${newUrl.slice(-40)} (${result.rowCount}行)`);
        totalUpdated += result.rowCount;
      }
    }

    await dbClient.query('COMMIT');
    console.log(`\n=== update-db完了: ${totalUpdated}行更新 ===`);
    console.log(`ロールバック用スナップショット: rollback_snapshot.jsonl（${snapshotUrls.size}件）`);

  } catch (e) {
    await dbClient.query('ROLLBACK');
    console.error('ERROR: トランザクション中にエラーが発生しました。ROLLBACKしました。', e.message);
    process.exit(1);
  }
}

// --- --rollback モード ---
async function runRollback(dbClient) {
  console.log(`\n--- rollback モード ---\n`);
  const rollbackFile = path.join(__dirname, '..', 'rollback_snapshot.jsonl');
  if (!fs.existsSync(rollbackFile)) {
    console.error('ERROR: rollback_snapshot.jsonl が見つかりません。');
    process.exit(1);
  }

  const rawLines = fs.readFileSync(rollbackFile, 'utf8').split('\n').filter(Boolean);
  if (rawLines.length === 0) {
    console.error('ERROR: rollback_snapshot.jsonl が空です。');
    process.exit(1);
  }
  const entries = rawLines.map(l => JSON.parse(l));
  const incompleteEntries = entries.filter(e => !e.vercel_url || !e.r2_url || !Array.isArray(e.refs) || e.refs.length === 0);
  if (incompleteEntries.length > 0) {
    console.error(`ERROR: rollback_snapshot.jsonl に不完全なエントリが ${incompleteEntries.length} 件あります。手動確認が必要です。`);
    for (const e of incompleteEntries) console.error('  ', JSON.stringify(e));
    process.exit(1);
  }
  console.log(`スナップショット: ${entries.length}件のURL復旧対象\n`);

  await dbClient.query('BEGIN');
  let totalRolledBack = 0;
  try {
    for (const entry of entries) {
      if (!entry.vercel_url || !entry.r2_url) continue;
      for (const ref of (entry.refs ?? [])) {
        // refs は {table, column, ...} 形式（deduplicateByUrl / migration_log.jsonl 由来）
        const { table: t, column: c } = ref;
        let result;
        if (t === 'events') {
          result = await dbClient.query(`UPDATE events SET image_url=$1 WHERE image_url=$2`, [entry.vercel_url, entry.r2_url]);
        } else if (t === 'public_pages' && c === 'image_urls') {
          result = await dbClient.query(`UPDATE public_pages SET image_urls=array_replace(image_urls,$1::text,$2::text) WHERE $1=ANY(image_urls)`, [entry.r2_url, entry.vercel_url]);
        } else if (t === 'public_pages' && c === 'blocks') {
          result = await dbClient.query(`UPDATE public_pages SET blocks=(SELECT jsonb_agg(CASE WHEN blk->>'imageUrl'=$1 THEN jsonb_set(blk,'{imageUrl}',to_jsonb($2::text)) ELSE blk END) FROM jsonb_array_elements(CASE jsonb_typeof(blocks) WHEN 'array' THEN blocks ELSE '[]'::jsonb END) AS blk) WHERE blocks::text LIKE '%'||$1||'%'`, [entry.r2_url, entry.vercel_url]);
        } else if (t === 'public_pages') {
          const ALLOWED_PP_COLS = ['cover_image_url', 'org_logo_wordmark_url', 'og_image_url'];
          if (!ALLOWED_PP_COLS.includes(c)) throw new Error(`不正なカラム名: ${c}（許可: ${ALLOWED_PP_COLS.join(', ')}）`);
          result = await dbClient.query(`UPDATE public_pages SET ${c}=$1 WHERE ${c}=$2`, [entry.vercel_url, entry.r2_url]);
        } else if (t === 'tenants') {
          result = await dbClient.query(`UPDATE tenants SET icon_url=$1 WHERE icon_url=$2`, [entry.vercel_url, entry.r2_url]);
        } else if (t === 'official_articles') {
          result = await dbClient.query(`UPDATE official_articles SET og_image_url=$1 WHERE og_image_url=$2`, [entry.vercel_url, entry.r2_url]);
        } else if (t === 'blog_posts') {
          result = await dbClient.query(`UPDATE blog_posts SET body=replace(body,$1,$2) WHERE body LIKE '%'||$1||'%'`, [entry.r2_url, entry.vercel_url]);
        }
        if (result === undefined) {
          console.warn(`⚠️  未対応: ${t}.${c} - スキップ`);
        } else if (result.rowCount > 0) {
          console.log(`↩️  ${t}.${c}: R2→Vercel (${result.rowCount}行)`);
          totalRolledBack += result.rowCount;
        }
      }
    }
    await dbClient.query('COMMIT');
    console.log(`\n=== rollback完了: ${totalRolledBack}行を旧URLに戻しました ===`);
  } catch (e) {
    await dbClient.query('ROLLBACK');
    console.error('ERROR: rollbackトランザクション失敗。', e.message);
    process.exit(1);
  }
}

// --- メイン ---
async function main() {
  const mode = isDryRun ? 'dry-run' : isCopy ? 'copy' : isVerify ? 'verify' : isUpdateDb ? 'update-db' : 'rollback';
  console.log(`=== Vercel Blob → R2 移行スクリプト v2 (モード: ${mode}) ===\n`);

  // DB接続（全モード共通）
  const dbClient = await getDbClient();
  let items;
  try {
    console.log('DBから全Vercel Blob URLを収集中...');
    const rawItems = await collectUrlsFromDb(dbClient);
    items = deduplicateByUrl(rawItems);
    console.log(`収集完了: ${rawItems.length}行 → ユニーク ${items.length}件\n`);
  } catch (e) {
    console.error('DB収集エラー:', e.message);
    await dbClient.end();
    process.exit(1);
  }

  // URL一覧出力（全モード）
  const r2PublicUrl = optEnv('NEXT_PUBLIC_R2_PUBLIC_URL') ?? 'https://images.comiu.link';
  for (const item of items) {
    const r2Key = computeR2Key(item.url);
    const heicNote = isHeic(item.url) ? ' 🔄HEIC→JPEG' : '';
    const refs = item.refs.map(r => `${r.table}.${r.column}[${r.tenant}]`).join(', ');
    console.log(`  Vercel: ${item.url}`);
    console.log(`  R2:     ${r2PublicUrl.replace(/\/$/, '')}/${r2Key}${heicNote}`);
    console.log(`  参照:   ${refs}\n`);
  }

  // HEIC対象のサマリー
  const heicItems = items.filter(i => isHeic(i.url));
  if (heicItems.length > 0) {
    console.log(`⚠️  HEIC変換対象: ${heicItems.length}件`);
    for (const h of heicItems) console.log(`    ${h.url}`);
    console.log('');
  }

  if (isDryRun) {
    console.log(`--- dry-run: コピーは行いません ---`);
    console.log(`ユニークURL: ${items.length}件（うちHEIC: ${heicItems.length}件）`);
    console.log(`実行するには: node scripts/migrate-vercel-to-r2.mjs --copy`);
    await dbClient.end();
    return;
  }

  // --copy / --verify のみ R2 認証情報が必要。--update-db / --rollback は DATABASE_URL のみ。
  if (isCopy || isVerify) {
    const bucket = requireEnv('R2_BUCKET_NAME');
    const r2 = getR2Client();
    if (isCopy)   await runCopy(items, r2, bucket, r2PublicUrl);
    if (isVerify) await runVerify(items, r2, bucket, r2PublicUrl);
  } else if (isUpdateDb) {
    await runUpdateDb(items, dbClient, r2PublicUrl);
  } else if (isRollback) {
    await runRollback(dbClient);
  }

  await dbClient.end();
}

main().catch(e => { console.error(e); process.exit(1); });
