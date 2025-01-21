const sqlite3 = require('better-sqlite3');
const path = require('path');

try {
  const db = sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'));
  
  // inventory 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      product_code TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      nz_stock INTEGER DEFAULT 0,
      aus_stock INTEGER DEFAULT 0,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Inventory table created successfully');
  db.close();
} catch (error) {
  console.error('Error creating inventory table:', error);
} 