import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const page = parseInt(searchParams.get('page')) || 1
  const pageSize = parseInt(searchParams.get('pageSize')) || 20
  const offset = (page - 1) * pageSize

  if (!query) {
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    })
  }

  const dbPath = path.join(process.cwd(), 'data', 'orderdash.db')
  const db = new Database(dbPath)

  try {
    // 검색 조건에 맞는 전체 아이템 수 조회
    const totalCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inventory 
      WHERE product_code LIKE ? OR product_name LIKE ?
    `).get(`%${query}%`, `%${query}%`).count

    // 페이지네이션된 검색 결과 조회
    const inventory = db.prepare(`
      SELECT 
        product_code,
        product_name,
        nz_stock,
        aus_stock,
        memo,
        created_at,
        updated_at
      FROM inventory
      WHERE 
        product_code LIKE ? OR 
        product_name LIKE ?
      ORDER BY product_code
      LIMIT ? OFFSET ?
    `).all(`%${query}%`, `%${query}%`, pageSize, offset)
    
    return NextResponse.json({
      items: inventory,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    })
  } catch (error) {
    console.error('Error searching inventory:', error)
    return NextResponse.json(
      { error: '재고 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 