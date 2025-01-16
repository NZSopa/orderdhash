'use server'

import sqlite3 from 'better-sqlite3'
import path from 'path'

function getDB() {
  return sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'))
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

    return { success: true }
  } catch (error) {
    console.error('Error running migrations:', error)
    return { success: false, error: error.message }
  } finally {
    db.close()
  }
} 