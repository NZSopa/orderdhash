const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

try {
  // 데이터베이스 연결
  const db = sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'));
  
  // SQL 파일 읽기
  const sql = fs.readFileSync('create_tables.sql', 'utf8');
  
  // SQL 실행
  db.exec(sql);
  
  console.log('Tables created successfully');
  
  // 데이터베이스 연결 종료
  db.close();
} catch (error) {
  console.error('Error creating tables:', error);
} 