import Database from 'better-sqlite3'
import path from 'path'

let db = null

export function getDB() {
  if (db) return db
  
  try {
    const dbPath = path.join(process.cwd(), 'data.db')
    db = new Database(dbPath)
    
    // WAL 모드 활성화
    db.pragma('journal_mode = WAL')
    
    // 외래키 제약 활성화
    db.pragma('foreign_keys = ON')

    // 캐시 크기 최적화
    db.pragma('cache_size = -2000') // 약 2MB 캐시

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

    // 인덱스 생성
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_product_unit_prices_year_month ON product_unit_prices(year_month);
      CREATE INDEX IF NOT EXISTS idx_product_master_name ON product_master(product_name);
      CREATE INDEX IF NOT EXISTS idx_product_unit_prices_memo ON product_unit_prices(memo);
    `)

    // 주문 테이블
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_no TEXT NOT NULL,
        sku TEXT NOT NULL,
        original_product_name TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_value INTEGER,
        consignee_name TEXT NOT NULL,
        kana TEXT,
        postal_code TEXT NOT NULL CHECK (length(replace(postal_code, '-', '')) = 7),
        address TEXT NOT NULL,
        phone_number TEXT NOT NULL CHECK (phone_number NOT LIKE '%[^0-9-]%'),
        sales_site TEXT NOT NULL,
        created_at TEXT NOT NULL CHECK (created_at LIKE '____-__-__ __:__:__'),
        FOREIGN KEY (sku) REFERENCES product_master(product_code)
      )
    `)

    return db
  } catch (error) {
    console.error('Error getting database connection:', error)
    throw error
  }
}

export function closeDB() {
  try {
    if (db) {
      db.close()
      db = null
    }
  } catch (error) {
    console.error('Error closing database:', error)
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

// 애플리케이션 종료 시 데이터베이스 연결 닫기
process.on('exit', () => {
  closeDB()
})

// 예기치 않은 종료 시에도 데이터베이스 연결 닫기
process.on('SIGINT', () => {
  closeDB()
  process.exit(0)
})

// 데이터베이스 초기화 함수
export async function initDB() {
  const db = getDB()
  try {
    console.log('Database initialized successfully')
  } finally {
    closeDB()
  }
}

// 애플리케이션 시작 시 DB 초기화 실행
initDB().catch(console.error) 