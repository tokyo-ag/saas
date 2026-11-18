'use strict';
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCAL_ADMIN = 'postgresql://postgres@localhost:5432/postgres';
const LOCAL_TEST  = 'postgresql://postgres@localhost:5432/comiu_restore_test';
const PG_BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const backupDir = path.join(__dirname, '..', 'backup');

const sqlFiles = fs.readdirSync(backupDir)
  .filter(f => f.startsWith('backup_full_') && f.endsWith('.sql'))
  .map(f => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtime }))
  .sort((a, b) => b.mtime - a.mtime);

if (sqlFiles.length === 0) {
  console.error('ERROR: バックアップSQLファイルが見つかりません');
  process.exit(1);
}

const sqlFile = path.join(backupDir, sqlFiles[0].name);
console.log(`使用バックアップ: ${sqlFiles[0].name}`);
console.log(`サイズ: ${(fs.statSync(sqlFile).size / 1024 / 1024).toFixed(2)} MB`);

const adminClient = new Client({ connectionString: LOCAL_ADMIN });

async function main() {
  try {
    await adminClient.connect();
    console.log('ローカルPostgreSQL接続: OK');
  } catch (e) {
    console.error('ERROR: ローカルPostgreSQLに接続できません:', e.message);
    console.error('PostgreSQL 17がlocalhost:5432で稼働していることを確認してください');
    process.exit(1);
  }

  try {
    await adminClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='comiu_restore_test'`);
    await adminClient.query('DROP DATABASE IF EXISTS comiu_restore_test');
    await adminClient.query('CREATE DATABASE comiu_restore_test');
    console.log('テストDB作成: OK');
  } catch (e) {
    console.error('テストDB作成失敗:', e.message);
    await adminClient.end();
    process.exit(1);
  }
  await adminClient.end();

  console.log('\nバックアップを復元中（数十秒かかります）...');
  try {
    const out = execSync(
      `"${PG_BIN}\\psql.exe" -h localhost -p 5432 -U postgres -d comiu_restore_test -f "${sqlFile}" 2>&1`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    const lines = out.split('\n').filter(l => l.match(/ERROR|error/));
    if (lines.length > 0) {
      console.warn('psql 警告/エラー行:', lines.slice(0, 5).join('\n'));
    } else {
      console.log('復元: OK（エラーなし）');
    }
  } catch (e) {
    console.warn('psql exit:', e.status, e.stderr?.substring(0, 300));
  }

  const testClient = new Client({ connectionString: LOCAL_TEST });
  await testClient.connect();

  const checks = [
    { label: 'テーブル数',      sql: "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" },
    { label: 'tenants',        sql: "SELECT COUNT(*) FROM tenants" },
    { label: 'events',         sql: "SELECT COUNT(*) FROM events" },
    { label: 'reservations',   sql: "SELECT COUNT(*) FROM reservations" },
    { label: 'members',        sql: "SELECT COUNT(*) FROM members" },
    { label: 'BELL予約',        sql: "SELECT COUNT(*) FROM reservations WHERE tenant_id='tenant-001'" },
    { label: 'BELL 12/01予約', sql: "SELECT COUNT(*) FROM reservations WHERE tenant_id='tenant-001' AND event_id='e43c2f1b-3ac4-49d5-9c5f-2a171ad9f9be'" },
    { label: 'BELL 12/23予約', sql: "SELECT COUNT(*) FROM reservations WHERE tenant_id='tenant-001' AND event_id='20eae236-92cd-481f-af4b-51a1847981df'" },
  ];

  console.log('\n=== 復元検証 ===');
  let pass = true;
  for (const c of checks) {
    try {
      const r = await testClient.query(c.sql);
      console.log(`  [OK] ${c.label}: ${r.rows[0].count}`);
    } catch (e) {
      console.log(`  [NG] ${c.label}: ${e.message}`);
      pass = false;
    }
  }

  await testClient.end();

  console.log('\n=== 復元テスト', pass ? '成功 ✓' : '一部失敗', '===');
  console.log('テストDB "comiu_restore_test" はローカルに残っています。');
  console.log('削除する場合:');
  console.log('  "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe" -h localhost -p 5432 -U postgres -c "DROP DATABASE comiu_restore_test;"');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
