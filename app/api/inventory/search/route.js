import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const page = parseInt(searchParams.get('page')) || 1
  const pageSize = parseInt(searchParams.get('pageSize')) || 20
  const sortField = searchParams.get('sortField') || 'product_code'
  const sortOrder = searchParams.get('sortOrder') || 'asc'
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

  // 정렬 필드 유효성 검사
  const validSortFields = ['product_code', 'product_name', 'nz_stock', 'aus_stock', 'memo', 'created_at']
  const actualSortField = validSortFields.includes(sortField) ? sortField : 'product_code'
  
  // total_stock는 계산된 필드이므로 특별 처리
  const orderByClause = sortField === 'total_stock' 
    ? `(nz_stock + aus_stock) ${sortOrder}`
    : `${actualSortField} ${sortOrder}`

  const dbPath = path.join(process.cwd(), 'data', 'orderdash.db')
  const db = new Database(dbPath)

  try {
    // 검색 조건에 맞는 전체 아이템 수 조회
    const totalCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inventory 
      WHERE product_code LIKE ? OR product_name LIKE ?
    `).get(`%${query}%`, `%${query}%`).count

    // 페이지네이션된 검색 결과 조회 (최신 원가 조인)
    const inventory = db.prepare(`
      SELECT 
        i.product_code,
        i.product_name,
        i.nz_stock,
        i.aus_stock,
        i.memo,
        i.created_at,
        i.updated_at,
        (
          SELECT p.price
          FROM product_unit_prices p
          WHERE p.product_code = i.product_code
          ORDER BY p.year_month DESC
          LIMIT 1
        ) AS unit_price
      FROM inventory i
      WHERE 
        i.product_code LIKE ? OR 
        i.product_name LIKE ?
      ORDER BY ${orderByClause}
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