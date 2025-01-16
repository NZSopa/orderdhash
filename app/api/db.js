import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'orderdash.db')

let db

try {
  db = new Database(dbPath)
  
  // 주문 이력 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT NOT NULL,
      sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      consignee_name TEXT NOT NULL,
      kana TEXT,
      post_code TEXT NOT NULL,
      address TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      unit_value REAL,
      order_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 파일 업로드 이력 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      status TEXT NOT NULL,
      processed_count INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 상품 코드 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_code TEXT NOT NULL UNIQUE,
      product_name TEXT NOT NULL,
      set_qty INTEGER NOT NULL DEFAULT 1,
      product_code TEXT NOT NULL,
      sales_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 재고 관리 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

} catch (error) {
  console.error('Database initialization error:', error)
}

// 재고 조회
export function getInventoryItems() {
  const stmt = db.prepare(`
    SELECT 
      i.*,
      CASE WHEN i.stock < i.min_stock THEN 'low' ELSE 'normal' END as status
    FROM inventory i
    ORDER BY i.code
  `)

  try {
    return stmt.all()
  } catch (error) {
    console.error('Error getting inventory items:', error)
    return []
  }
}

// 재고 검색
export function searchInventoryItems(query) {
  const stmt = db.prepare(`
    SELECT 
      i.*,
      CASE WHEN i.stock < i.min_stock THEN 'low' ELSE 'normal' END as status
    FROM inventory i
    WHERE i.code LIKE ? OR i.name LIKE ?
    ORDER BY i.code
  `)

  try {
    const searchPattern = `%${query}%`
    return stmt.all(searchPattern, searchPattern)
  } catch (error) {
    console.error('Error searching inventory items:', error)
    return []
  }
}

// 재고 저장
export function saveInventoryItem(item) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO inventory (
      code, name, stock, min_stock, updated_at
    ) VALUES (
      @code, @name, @stock, @min_stock, CURRENT_TIMESTAMP
    )
  `)

  try {
    stmt.run(item)
    return true
  } catch (error) {
    console.error('Error saving inventory item:', error)
    return false
  }
}

// 재고 삭제
export function deleteInventoryItem(code) {
  const stmt = db.prepare('DELETE FROM inventory WHERE code = ?')

  try {
    stmt.run(code)
    return true
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return false
  }
}

// 재고 부족 항목 조회
export function getLowStockItems() {
  const stmt = db.prepare(`
    SELECT 
      i.*,
      'low' as status
    FROM inventory i
    WHERE i.stock < i.min_stock
    ORDER BY i.code
  `)

  try {
    return stmt.all()
  } catch (error) {
    console.error('Error getting low stock items:', error)
    return []
  }
}

export default db 