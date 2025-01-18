import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const product_code = searchParams.get('product_code')
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20
  const offset = (page - 1) * limit
  const sortField = searchParams.get('sortField') || 'year_month'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // 유효한 정렬 필드 검증
  const validSortFields = ['product_code', 'year_month', 'price', 'memo']
  if (!validSortFields.includes(sortField)) {
    return NextResponse.json({ success: false, error: '잘못된 정렬 필드입니다.' }, { status: 400 })
  }

  try {
    const db = getDB()
    
    // 검색 조건 설정
    let whereClause = ''
    const params = []
    if (product_code) {
      whereClause = 'WHERE product_code LIKE ?'
      params.push(`%${product_code}%`)
    }

    // 전체 데이터 수 조회
    const countQuery = `SELECT COUNT(*) as total FROM Products_UnitPrice ${whereClause}`
    const { total } = db.prepare(countQuery).get(...params)

    // 데이터 조회 쿼리
    const query = `
      SELECT * FROM Products_UnitPrice 
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `
    const data = db.prepare(query).all(...params, limit, offset)

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching prices:', error)
    return NextResponse.json(
      { success: false, error: '원가 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const db = getDB()
    const body = await request.json()
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO Products_UnitPrice (
        product_code, year_month, price, memo, updated_at
      ) VALUES (
        @product_code, @year_month, @price, @memo,
        CURRENT_TIMESTAMP
      )
    `)

    if (Array.isArray(body.prices)) {
      // 일괄 저장
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          stmt.run(item)
        }
      })
      insertMany(body.prices)
    } else if (body.price) {
      // 단일 데이터 저장
      stmt.run(body.price)
    } else {
      return NextResponse.json(
        { error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      message: '원가 데이터가 저장되었습니다.',
      success: true 
    })
  } catch (error) {
    console.error('Error saving unit price:', error)
    return NextResponse.json(
      { error: '원가 데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const db = getDB()
    const { searchParams } = new URL(request.url)
    const product_code = searchParams.get('product_code')
    const year_month = searchParams.get('year_month')
    const deleteAll = searchParams.get('deleteAll')

    if (deleteAll === 'true') {
      // 전체 삭제
      const result = db.prepare('DELETE FROM Products_UnitPrice').run()
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
      'DELETE FROM Products_UnitPrice WHERE product_code = ? AND year_month = ?'
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