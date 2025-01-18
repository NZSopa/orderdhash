import Database from 'better-sqlite3'
import path from 'path'

let db = null

export function getDB() {
  if (!db) {
    try {
      db = new Database(path.join(process.cwd(), 'data', 'orderdash.db'), {
        verbose: console.log,
        fileMustExist: true
      })
      
      // 데이터베이스 설정
      db.pragma('journal_mode = WAL')
      db.pragma('foreign_keys = ON')
    } catch (error) {
      console.error('Database connection error:', error)
      throw error
    }
  }
  return db
}

// 애플리케이션 종료 시 데이터베이스 연결 닫기
process.on('exit', () => {
  if (db) {
    console.log('Closing database connection...')
    db.close()
  }
})

// 예기치 않은 종료 시에도 데이터베이스 연결 닫기
process.on('SIGINT', () => {
  if (db) {
    console.log('Closing database connection...')
    db.close()
  }
  process.exit(0)
})

// 상품 코드 조회
export async function getProductCodes() {
  const db = getDB()
  try {
    const codes = db.prepare('SELECT * FROM product_codes ORDER BY sales_code').all()
    return codes
  } finally {
    db.close()
  }
}

// 상품 코드 검색
export async function searchProductCodes(query) {
  const db = getDB()
  try {
    const codes = db.prepare(`
      SELECT * FROM product_codes 
      WHERE sales_code LIKE ? OR product_name LIKE ?
      ORDER BY sales_code
    `).all(`%${query}%`, `%${query}%`)
    return codes
  } finally {
    db.close()
  }
}

// 상품 코드 저장
export async function saveProductCode(code) {
  const db = getDB()
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO product_codes (
        sales_code, product_name, set_qty, product_code, 
        sales_price, weight, sales_site, updated_at, created_at
      ) VALUES (
        @sales_code, @product_name, @set_qty, @product_code,
        @sales_price, @weight, @sales_site,
        CURRENT_TIMESTAMP,
        COALESCE((SELECT created_at FROM product_codes WHERE sales_code = @sales_code), CURRENT_TIMESTAMP)
      )
    `)
    stmt.run(code)
    return true
  } finally {
    db.close()
  }
}

// 상품 코드 일괄 저장
export async function bulkSaveProductCodes(codes) {
  const db = getDB()
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO product_codes (
        sales_code, product_name, set_qty, product_code,
        sales_price, weight, sales_site, updated_at, created_at
      ) VALUES (
        @sales_code, @product_name, @set_qty, @product_code,
        @sales_price, @weight, @sales_site,
        CURRENT_TIMESTAMP,
        COALESCE((SELECT created_at FROM product_codes WHERE sales_code = @sales_code), CURRENT_TIMESTAMP)
      )
    `)
    
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item)
      }
    })
    
    insertMany(codes)
    return true
  } finally {
    db.close()
  }
}

// 판매 사이트 조회
export async function getSalesSites() {
  const db = getDB()
  try {
    const sites = db.prepare('SELECT * FROM sales_sites ORDER BY code').all()
    return sites
  } finally {
    db.close()
  }
}

// 판매 사이트 저장
export async function saveSalesSite(site) {
  const db = getDB()
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sales_sites (
        code, name, updated_at, created_at
      ) VALUES (
        @code, @name,
        CURRENT_TIMESTAMP,
        COALESCE((SELECT created_at FROM sales_sites WHERE code = @code), CURRENT_TIMESTAMP)
      )
    `)
    stmt.run(site)
    return true
  } catch (error) {
    console.error('Error saving sales site:', error)
    throw error
  }
}

// 판매 사이트 삭제
export async function deleteSalesSite(code) {
  const db = getDB()
  try {
    db.prepare('DELETE FROM sales_sites WHERE code = ?').run(code)
    return true
  } catch (error) {
    console.error('Error deleting sales site:', error)
    throw error
  }
}

// 파일 업로드 이력 저장
export function saveFileUpload(fileName, fileType, status, processedCount, errorMessage = null) {
  const db = getDB()
  try {
    const stmt = db.prepare(`
      INSERT INTO file_uploads (
        file_name, file_type, status, processed_count, error_message,
        created_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)
    
    stmt.run(fileName, fileType, status, processedCount, errorMessage)
    return true
  } catch (error) {
    console.error('Error saving file upload:', error)
    throw error
  }
}

// 주문 데이터 저장
export function saveOrders(orders, orderType) {
  const db = getDB()
  try {
    const stmt = db.prepare(`
      INSERT INTO orders (
        reference_no, sku, product_name, original_product_name, quantity,
        consignee_name, kana, post_code, address,
        phone_number, unit_value, order_type,
        created_at
      ) VALUES (
        @reference_no, @sku, @product_name, @original_product_name, @quantity,
        @consignee_name, @kana, @post_code, @address,
        @phone_number, @unit_value, @order_type,
        CURRENT_TIMESTAMP
      )
    `)

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        const productName = item['product-name']
        stmt.run({
          reference_no: item['reference No.'],
          sku: item.sku,
          product_name: productName,
          original_product_name: item.originalProductName || productName,
          quantity: item['quantity-purchased'],
          consignee_name: item['Consignees NAME'],
          kana: item['Kana'],
          post_code: item['ConsigneesPOST'],
          address: item['Consignees Address'],
          phone_number: item['ConsigneesPhonenumber'],
          unit_value: item['unit value'],
          order_type: orderType
        })
      }
    })

    insertMany(orders)
    return true
  } catch (error) {
    console.error('Error saving orders:', error)
    throw error
  }
}

export function getProductNameByCode(db, productCode, originalName) {
  try {
    const stmt = db.prepare('SELECT product_name, set_qty FROM product_codes WHERE sales_code = ?')
    const result = stmt.get(productCode)
    if (result) {
      const setQty = parseInt(result.set_qty) || 1
      const codeName = setQty >= 2 ? `${result.product_name} ${setQty} SETS` : result.product_name
      return codeName
    }
    return originalName
  } catch (error) {
    console.error('Error getting product name:', error)
    return originalName
  }
}

export function initDB() {
  const db = getDB()
  
  // 기존 테이블이 있는지 확인
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").get()
  
  if (!tableExists) {
    // 테이블이 없으면 새로 생성
    db.exec(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_no TEXT NOT NULL UNIQUE,
        sku TEXT,
        product_name TEXT,
        original_product_name TEXT,
        quantity INTEGER DEFAULT 1,
        unit_value REAL DEFAULT 0,
        consignee_name TEXT,
        kana TEXT,
        post_code TEXT,
        address TEXT,
        phone_number TEXT,
        order_type TEXT NOT NULL,
        sales_site TEXT,
        created_at TEXT NOT NULL
      )
    `)
  } else {
    // 테이블이 있으면 sales_site 컬럼이 있는지 확인
    const columnExists = db.prepare("SELECT * FROM pragma_table_info('orders') WHERE name='sales_site'").get()
    
    if (!columnExists) {
      // sales_site 컬럼 추가
      db.exec(`
        ALTER TABLE orders ADD COLUMN sales_site TEXT;
      `)
      console.log('Added sales_site column to orders table')
    }
  }

  return db
}

// 애플리케이션 시작 시 DB 초기화 실행
initDB()

export default db 