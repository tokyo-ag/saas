/**
 * Cloudflare R2 接続テストスクリプト
 *
 * 使用方法:
 *   環境変数を設定してから実行:
 *   R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx \
 *   R2_BUCKET_NAME=comiu-images NEXT_PUBLIC_R2_PUBLIC_URL=https://images.comiu.link \
 *   node scripts/r2-test.mjs
 *
 * テスト内容:
 *   1. バケット存在確認
 *   2. テスト画像アップロード (1x1 PNG)
 *   3. アップロードした画像を公開URLで取得確認
 *   4. テスト画像を削除
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

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

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey: secretKey },
});

// 1x1 透明 PNG (最小サイズ)
const TEST_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);
const TEST_KEY = `test/r2-connectivity-test-${Date.now()}.png`;

let pass = 0, fail = 0;

function ok(msg) { console.log(`[PASS] ${msg}`); pass++; }
function ng(msg, err) { console.log(`[FAIL] ${msg}: ${err?.message ?? err}`); fail++; }

console.log('=== Cloudflare R2 接続テスト ===');
console.log(`バケット: ${bucket}`);
console.log(`エンドポイント: https://${accountId}.r2.cloudflarestorage.com`);
console.log(`公開URL: ${publicUrl}\n`);

// 1. バケット存在確認
try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  ok(`バケット "${bucket}" の存在確認`);
} catch (e) {
  ng(`バケット "${bucket}" の存在確認`, e);
  console.error('バケットが存在しないか、認証情報が誤っています。処理を中断します。');
  process.exit(1);
}

// 2. テスト画像アップロード
try {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: TEST_KEY,
    Body: TEST_PNG,
    ContentType: 'image/png',
  }));
  ok(`テスト画像アップロード (key: ${TEST_KEY})`);
} catch (e) {
  ng('テスト画像アップロード', e);
}

// 3. 公開URLで取得確認
const imgUrl = `${publicUrl}/${TEST_KEY}`;
try {
  const res = await fetch(imgUrl);
  if (res.ok && res.headers.get('content-type')?.includes('image')) {
    ok(`公開URL取得確認 (${res.status} ${res.headers.get('content-type')})`);
    console.log(`    URL: ${imgUrl}`);
  } else {
    ng('公開URL取得確認', `status=${res.status} content-type=${res.headers.get('content-type')}`);
    console.log(`    URL: ${imgUrl}`);
    console.log('    ※ カスタムドメインが未設定の場合は S3 API 直接確認に切り替えてください');
  }
} catch (e) {
  ng('公開URL取得確認', e);
  console.log(`    URL: ${imgUrl}`);
  console.log('    ※ カスタムドメイン未設定の場合は設定後に再テストしてください');
}

// 4. S3 API でオブジェクト存在確認
try {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: TEST_KEY }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  const size = Buffer.concat(chunks).length;
  ok(`S3 API 経由で取得確認 (${size} bytes)`);
} catch (e) {
  ng('S3 API 経由で取得確認', e);
}

// 5. テスト画像を削除
try {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: TEST_KEY }));
  ok(`テスト画像を削除 (key: ${TEST_KEY})`);
} catch (e) {
  ng('テスト画像を削除', e);
}

console.log(`\n=== 結果: ${pass} PASS / ${fail} FAIL ===`);
if (fail === 0) {
  console.log('✅ R2接続テスト完了。本番デプロイの準備ができました。');
} else {
  console.log('❌ 一部テストが失敗しました。設定を確認してください。');
  process.exit(1);
}
