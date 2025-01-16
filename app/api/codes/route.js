import { NextResponse } from 'next/server'
import sqlite3 from 'better-sqlite3'
import path from 'path'

function getDB() {
  return sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'))
}

// GET /api/codes
export async function GET(request) {
  const db = getDB()
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = (page - 1) * limit

    let stmt
    let countStmt
    let params = []

    if (query) {
      const searchPattern = `%${query}%`
      const searchParams = Array(7).fill(searchPattern)

      // 먼저 검색 조건에 맞는 전체 데이터를 서브쿼리로 가져옴
      stmt = db.prepare(`
        WITH filtered_codes AS (
          SELECT * FROM product_codes 
          WHERE sales_code LIKE ? 
          OR product_name LIKE ? 
          OR product_code LIKE ?
          OR set_qty LIKE ?
          OR sales_price LIKE ?
          OR weight LIKE ?
          OR sales_site LIKE ?
          ORDER BY created_at DESC
        )
        SELECT * FROM filtered_codes
        LIMIT ? OFFSET ?
      `)

      countStmt = db.prepare(`
        SELECT COUNT(*) as total FROM product_codes 
        WHERE sales_code LIKE ? 
        OR product_name LIKE ? 
        OR product_code LIKE ?
        OR set_qty LIKE ?
        OR sales_price LIKE ?
        OR weight LIKE ?
        OR sales_site LIKE ?
      `)

      const { total } = countStmt.get(...searchParams)
      const data = stmt.all(...[...searchParams, limit, offset])
      
      return NextResponse.json({ 
        data,
        total,
        page,
        limit
      })
    } else {
      stmt = db.prepare(`
        SELECT * FROM product_codes 
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      countStmt = db.prepare('SELECT COUNT(*) as total FROM product_codes')
      const { total } = countStmt.get()
      const data = stmt.all(limit, offset)
      
      return NextResponse.json({ 
        data,
        total,
        page,
        limit
      })
    }
  } catch (error) {
    console.error('Error fetching codes:', error)
    return NextResponse.json(
      { error: '코드 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

// POST /api/codes
export async function POST(request) {
  try {
    const body = await request.json()
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

      if (body.codes) {
        // 일괄 저장
        const insertMany = db.transaction((items) => {
          for (const item of items) {
            stmt.run(item)
          }
        })
        insertMany(body.codes)
      } else if (body.code) {
        // 단일 코드 저장
        stmt.run(body.code)
      } else {
        return NextResponse.json(
          { error: '저장할 데이터가 없습니다.' },
          { status: 400 }
        )
      }

      return NextResponse.json({ 
        message: '코드가 저장되었습니다.',
        success: true 
      })
    } finally {
      db.close()
    }
  } catch (error) {
    console.error('Error saving product code:', error)
    return NextResponse.json(
      { error: '코드 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/codes
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const salesCode = searchParams.get('sales_code')
    const action = searchParams.get('action')
    const answer = searchParams.get('answer')
    const userAnswer = searchParams.get('userAnswer')
    
    if (action === 'deleteAll') {
      if (!answer || !userAnswer) {
        return NextResponse.json(
          { error: '수식 답변이 필요합니다.' },
          { status: 400 }
        )
      }

      if (answer !== userAnswer) {
        return NextResponse.json(
          { error: '수식이 올바르지 않습니다. 다시 시도해주세요.' },
          { status: 400 }
        )
      }

      const db = getDB()
      try {
        db.prepare('DELETE FROM product_codes').run()
        return NextResponse.json({ 
          message: '모든 코드가 삭제되었습니다.',
          success: true 
        })
      } finally {
        db.close()
      }
    }
    
    if (!salesCode) {
      return NextResponse.json(
        { error: '삭제할 코드가 필요합니다.' },
        { status: 400 }
      )
    }

    const db = getDB()
    try {
      db.prepare('DELETE FROM product_codes WHERE sales_code = ?').run(salesCode)
      return NextResponse.json({ 
        message: '코드가 삭제되었습니다.',
        success: true 
      })
    } finally {
      db.close()
    }
  } catch (error) {
    console.error('Error deleting product code:', error)
    return NextResponse.json(
      { error: '코드 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 