import Database from 'better-sqlite3'
import path from 'path'

let db = null

export function getDB() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'orderdash.db')
    db = new Database(dbPath)
  }
  return db
}

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
        reference_no, sku, product_name, quantity,
        consignee_name, kana, post_code, address,
        phone_number, unit_value, order_type,
        created_at
      ) VALUES (
        @reference_no, @sku, @product_name, @quantity,
        @consignee_name, @kana, @post_code, @address,
        @phone_number, @unit_value, @order_type,
        CURRENT_TIMESTAMP
      )
    `)

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run({
          reference_no: item['reference No.'],
          sku: item.sku,
          product_name: item['product-name'],
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

export default db 