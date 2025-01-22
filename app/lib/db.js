import Database from 'better-sqlite3'
import path from 'path'

let db = null

export function getDB() {
  if (db) {
    try {
      // 연결 상태 확인을 위한 간단한 쿼리 실행
      db.prepare('SELECT 1').get()
      return db
    } catch (error) {
      // 연결이 끊어진 경우 db 객체 초기화
      db = null
    }
  }
  
  try {
    const dbPath = path.join(process.cwd(), 'data', 'orderdash.db')
    db = new Database(dbPath)
    
    // WAL 모드 활성화
    db.pragma('journal_mode = WAL')
    
    // 외래키 제약 활성화
    db.pragma('foreign_keys = ON')

    // 캐시 크기 최적화
    db.pragma('cache_size = -2000') // 약 2MB 캐시

    // 테이블 생성
    createTables(db)

    return db
  } catch (error) {
    console.error('Database connection error:', error)
    throw error
  }
}

function createTables(db) {
  // 제품 마스터 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_master (
      product_code TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      brand TEXT,
      supplier TEXT,
      image_url TEXT,
      description TEXT,
      barcode TEXT,
      shipping_from TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (product_code <> '')
    )
  `)

  // 제품 단가 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_unit_prices (
      product_code TEXT,
      year_month TEXT,
      price REAL NOT NULL CHECK (price >= 0),
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (product_code, year_month),
      FOREIGN KEY (product_code) REFERENCES product_master(product_code) ON DELETE CASCADE,
      CHECK (year_month LIKE '____-__')
    )
  `)

  // 출품 정보 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      set_qty INTEGER DEFAULT 1,
      product_code TEXT,
      sales_price INTEGER DEFAULT 0,
      weight REAL DEFAULT 0,
      sales_site TEXT,
      site_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export function closeDB() {
  if (db) {
    try {
      db.close()
    } catch (error) {
      console.error('Error closing database:', error)
    } finally {
      db = null
    }
  }
}

// 데이터베이스 작업을 위한 헬퍼 함수
export async function withDB(operation) {
  const db = getDB()
  try {
    return await operation(db)
  } finally {
    // 연결을 닫지 않고 재사용
  }
}

export function getProductNameByCode(db, productCode, defaultName = '') {
  try {
    const result = db.prepare('SELECT product_name FROM product_master WHERE product_code = ?')
      .get(productCode)
    return result ? result.product_name : defaultName
  } catch (error) {
    console.error('Error getting product name:', error)
    return defaultName
  }
}

// 이벤트 리스너는 한 번만 등록
if (!process.listenerCount('exit')) {
  process.once('exit', () => {
    closeDB()
  })
}

if (!process.listenerCount('SIGINT')) {
  process.once('SIGINT', () => {
    closeDB()
    process.exit(0)
  })
} 