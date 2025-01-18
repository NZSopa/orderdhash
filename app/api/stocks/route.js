import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const pageSize = parseInt(searchParams.get('pageSize')) || 20
    const search = searchParams.get('search') || ''
    const date = searchParams.get('date')
    const offset = (page - 1) * pageSize

    return withDB(db => {
      let query = `
        WITH filtered_inventory AS (
          SELECT * FROM inventory
          WHERE (
            product_code LIKE ? 
            OR product_name LIKE ?
            OR memo LIKE ?
          )
          ${date ? "AND DATE(created_at) = DATE(?)" : ""}
        )
        SELECT * FROM filtered_inventory
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `

      const searchPattern = `%${search}%`
      let params = Array(3).fill(searchPattern)
      if (date) {
        params.push(date)
      }
      params = params.concat([pageSize, offset])
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM inventory
        WHERE (
          product_code LIKE ? 
          OR product_name LIKE ?
          OR memo LIKE ?
        )
        ${date ? "AND DATE(created_at) = DATE(?)" : ""}
      `
      
      const items = db.prepare(query).all(...params)
      const { total } = db.prepare(countQuery).get(...params.slice(0, date ? 4 : 3))
      
      return NextResponse.json({
        success: true,
        data: items,
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
        message: total === 0 ? '현재 등록된 재고가 없습니다.' : undefined
      })
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({
      success: false,
      error: '재고 목록을 불러오는 중 오류가 발생했습니다.',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const items = await req.json()
    
    return withDB(db => {
      // 기존 상품 코드 조회
      const duplicateErrors = []
      const validItems = []

      // 모든 상품 코드 목록을 한 번에 가져오기
      const existingItems = db.prepare('SELECT product_code FROM inventory').all()
      const existingCodes = new Set(existingItems.map(item => item.product_code))
      
      for (const item of items) {
        if (existingCodes.has(item.product_code)) {
          duplicateErrors.push({
            product_code: item.product_code,
            error_type: 'duplicate',
            message: '이미 등록된 상품 코드입니다.'
          })
        } else {
          validItems.push(item)
        }
      }

      // 유효한 재고만 저장
      if (validItems.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO inventory (
            product_code, product_name, stock,
            min_stock, memo, created_at
          ) VALUES (
            @product_code, @product_name, @stock,
            @min_stock, @memo, CURRENT_TIMESTAMP
          )
        `)

        const insertMany = db.transaction((items) => {
          for (const item of items) {
            stmt.run(item)
          }
        })

        insertMany(validItems)
      }

      return NextResponse.json({
        success: true,
        total: validItems.length,
        duplicateErrors: duplicateErrors,
        errorCount: duplicateErrors.length,
        summary: {
          total: items.length,
          success: validItems.length,
          error: duplicateErrors.length
        }
      })
    })
  } catch (error) {
    console.error('Error processing inventory:', error)
    return NextResponse.json(
      { success: false, error: '재고 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 