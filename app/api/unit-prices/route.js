import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  let db = null
  try {
    db = getDB()
    
    // URL 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const sortField = searchParams.get('sortField') || 'year_month'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit
    let whereClause = ''
    const params = []

    if (search) {
      whereClause = `
        WHERE (
          p.product_code LIKE ? OR 
          pc.product_name LIKE ? OR
          p.memo LIKE ?
        )
      `
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    // 전체 데이터 수 조회
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM product_unit_prices p
      LEFT JOIN product_master pc ON p.product_code = pc.product_code
      ${whereClause}
    `)
    
    const { total } = countStmt.get(...params)
    
    // 페이지 데이터 조회
    const stmt = db.prepare(`
      SELECT 
        p.product_code,
        pc.product_name,
        p.year_month,
        p.price,
        p.memo,
        p.created_at,
        p.updated_at,
        pc.brand,
        pc.supplier
      FROM product_unit_prices p
      LEFT JOIN product_master pc ON p.product_code = pc.product_code
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `)
    
    const prices = stmt.all(...params, limit, offset)

    return NextResponse.json({
      data: prices,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching prices:', error)
    return NextResponse.json(
      { error: '가격 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  const db = getDB()
  try {
    const data = await req.json()
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO product_unit_prices (
        product_code,
        year_month,
        price,
        memo
      ) VALUES (?, ?, ?, ?)
    `)

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run([
          item.product_code,
          item.year_month,
          item.price,
          item.memo || null
        ])
      }
    })

    insertMany(data)

    return NextResponse.json({ 
      success: true,
      message: '단가 정보가 성공적으로 저장되었습니다.',
      count: data.length
    })

  } catch (error) {
    console.error('Error inserting unit prices:', error)
    return NextResponse.json(
      { error: '단가 정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  let db = null
  try {
    db = getDB()
    const { searchParams } = new URL(request.url)
    const product_code = searchParams.get('product_code')
    const year_month = searchParams.get('year_month')
    const deleteAll = searchParams.get('deleteAll')

    if (deleteAll === 'true') {
      // 전체 삭제
      const result = db.prepare('DELETE FROM product_unit_prices').run()
      return NextResponse.json({ 
        message: '모든 원가 데이터가 삭제되었습니다.',
        success: true,
        deletedCount: result.changes
      })
    }

    // 개별 삭제
    if (!product_code || !year_month) {
      return NextResponse.json(
        { error: '제품 코드와 년월이 필요합니다.' },
        { status: 400 }
      )
    }

    const result = db.prepare(
      'DELETE FROM product_unit_prices WHERE product_code = ? AND year_month = ?'
    ).run(product_code, year_month)

    if (result.changes === 0) {
      return NextResponse.json(
        { error: '삭제할 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      message: '원가 데이터가 삭제되었습니다.',
      success: true 
    })
  } catch (error) {
    console.error('Error deleting unit price:', error)
    return NextResponse.json(
      { error: '원가 데이터 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 