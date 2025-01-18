'use server'

import sqlite3 from 'better-sqlite3'
import path from 'path'

function getDB() {
  return sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'))
}

// inventory 테이블 생성
const createInventoryTable = db => {
  try {
    // 기존 테이블 강제 삭제
    db.prepare("DROP TABLE IF EXISTS inventory").run()
    
    // 새 테이블 생성
    db.prepare(`
      CREATE TABLE inventory (
        product_code TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        nz_stock INTEGER DEFAULT 0,
        aus_stock INTEGER DEFAULT 0,
        memo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
  } catch (error) {
    console.error('Error creating inventory table:', error)
    throw error
  }
}

export async function runMigrations() {
  const db = getDB()
  try {
    // 판매 사이트 테이블 생성
    db.prepare(`
      CREATE TABLE IF NOT EXISTS sales_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 상품 코드 테이블 생성
    db.prepare(`
      CREATE TABLE IF NOT EXISTS product_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sales_code TEXT UNIQUE NOT NULL,
        product_name TEXT NOT NULL,
        set_qty INTEGER DEFAULT 1,
        product_code TEXT,
        sales_price INTEGER DEFAULT 0,
        weight REAL DEFAULT 0,
        sales_site TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 주문 테이블 생성
    db.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_no TEXT NOT NULL,
        sku TEXT,
        product_name TEXT,
        original_product_name TEXT,
        quantity INTEGER DEFAULT 1,
        consignee_name TEXT,
        kana TEXT,
        post_code TEXT,
        address TEXT,
        phone_number TEXT,
        unit_value INTEGER DEFAULT 0,
        order_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 파일 업로드 이력 테이블 생성
    db.prepare(`
      CREATE TABLE IF NOT EXISTS file_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        status TEXT NOT NULL,
        processed_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 기존 orders 테이블에 original_product_name 칼럼 추가
    try {
      db.prepare('ALTER TABLE orders ADD COLUMN original_product_name TEXT').run()
    } catch (error) {
      // 칼럼이 이미 존재하는 경우 무시
      if (!error.message.includes('duplicate column name')) {
        throw error
      }
    }

    // 기본 판매 사이트 데이터가 없는 경우에만 추가
    const existingSites = db.prepare('SELECT COUNT(*) as count FROM sales_sites').get()
    if (existingSites.count === 0) {
      const sites = [
        { code: 'NZP', name: 'NZP' },
        { code: 'SKY', name: 'SKY' },
        { code: 'ARH', name: 'ARH' },
        { code: 'NZP_USA', name: 'NZP USA' },
        { code: 'Qoo10', name: 'Qoo10' },
        { code: 'NZGift', name: 'NZ Gift' }
      ]

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO sales_sites (code, name)
        VALUES (@code, @name)
      `)

      const insertMany = db.transaction((items) => {
        for (const item of items) {
          stmt.run(item)
        }
      })

      insertMany(sites)
    }

    createInventoryTable(db)

    return { success: true }
  } catch (error) {
    console.error('Error running migrations:', error)
    return { success: false, error: error.message }
  } finally {
    db.close()
  }
} 