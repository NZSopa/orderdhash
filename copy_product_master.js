const sqlite3 = require('better-sqlite3');
const path = require('path');

try {
  // 소스 데이터베이스 연결
  const sourceDb = new sqlite3(path.join(process.cwd(), 'data.db'));
  
  // 대상 데이터베이스 연결
  const targetDb = new sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'));
  
  // 트랜잭션 시작
  targetDb.exec('BEGIN TRANSACTION');
  
  try {
    // 소스 데이터베이스에서 데이터 읽기
    const rows = sourceDb.prepare('SELECT * FROM product_master').all();
    console.log(`${rows.length}개의 데이터를 찾았습니다.`);
    
    // 대상 데이터베이스에 데이터 삽입
    const insertStmt = targetDb.prepare(`
      INSERT OR REPLACE INTO product_master (
        product_code,
        product_name,
        brand,
        supplier,
        image_url,
        description,
        barcode,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let insertedCount = 0;
    for (const row of rows) {
      insertStmt.run(
        row.product_code,
        row.product_name,
        row.brand,
        row.supplier,
        row.image_url,
        row.description,
        row.barcode,
        row.created_at,
        row.updated_at
      );
      insertedCount++;
    }
    
    // 트랜잭션 커밋
    targetDb.exec('COMMIT');
    console.log(`${insertedCount}개의 데이터가 성공적으로 복사되었습니다.`);
  } catch (error) {
    // 오류 발생 시 롤백
    targetDb.exec('ROLLBACK');
    throw error;
  } finally {
    // 데이터베이스 연결 닫기
    sourceDb.close();
    targetDb.close();
  }
} catch (error) {
  console.error('데이터 복사 중 오류 발생:', error);
} 