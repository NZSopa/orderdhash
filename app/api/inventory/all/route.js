import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page')) || 1
  const pageSize = parseInt(searchParams.get('pageSize')) || 20
  const offset = (page - 1) * pageSize

  const dbPath = path.join(process.cwd(), 'data', 'orderdash.db')
  const db = new Database(dbPath)
  
  try {
    // 전체 아이템 수 조회
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get().count

    // 페이지네이션된 데이터 조회
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
      ORDER BY product_code
      LIMIT ? OFFSET ?
    `).all(pageSize, offset)
    
    return NextResponse.json({
      items: inventory,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: '재고 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 