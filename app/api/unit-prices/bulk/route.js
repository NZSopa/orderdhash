import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function POST(req) {
  let db = null
  try {
    db = getDB()
    const body = await req.json()
    
    if (!Array.isArray(body.prices) || body.prices.length === 0) {
      return NextResponse.json(
        { error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // 데이터 유효성 검사
    const invalidItems = body.prices.filter(item => 
      !item.product_code || 
      !item.year_month || 
      typeof item.price !== 'number' ||
      !/^\d{4}-\d{2}$/.test(item.year_month)
    )

    if (invalidItems.length > 0) {
      return NextResponse.json({
        error: '유효하지 않은 데이터가 포함되어 있습니다.',
        invalidItems,
        details: '제품 코드, 년월(YYYY-MM), 단가는 필수 항목입니다.'
      }, { status: 400 })
    }

    // 제품 코드 존재 여부 확인
    const checkProductStmt = db.prepare('SELECT product_code FROM product_master WHERE product_code = ?')
    const missingProducts = body.prices.filter(item => !checkProductStmt.get(item.product_code))

    if (missingProducts.length > 0) {
      return NextResponse.json({
        error: '제품 마스터에 등록되지 않은 제품 코드가 있습니다.',
        missingProducts: missingProducts.map(item => ({
          product_code: item.product_code,
          year_month: item.year_month
        }))
      }, { status: 400 })
    }

    // 트랜잭션 시작
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO product_unit_prices (
        product_code, year_month, price, memo, updated_at
      ) VALUES (
        @product_code, @year_month, @price, @memo,
        CURRENT_TIMESTAMP
      )
    `)

    const insertMany = db.transaction((items) => {
      let processedCount = 0
      let errorCount = 0
      const errors = []

      for (const item of items) {
        try {
          insertStmt.run(item)
          processedCount++
        } catch (error) {
          errorCount++
          errors.push({
            item,
            error: error.message
          })
          // 단일 항목 실패는 전체 트랜잭션을 롤백하지 않음
          console.error('Error inserting item:', item, error)
        }
      }

      return { processedCount, errorCount, errors }
    })

    const { processedCount, errorCount, errors } = insertMany(body.prices)

    if (processedCount === 0) {
      return NextResponse.json({
        error: '데이터 저장에 실패했습니다.',
        details: errors
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: errorCount > 0 
        ? `전체 ${body.prices.length}개 중 ${processedCount}개가 저장되었으며, ${errorCount}개는 실패했습니다.`
        : '원가 데이터가 성공적으로 저장되었습니다.',
      success: errorCount === 0,
      total: body.prices.length,
      processed: processedCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error saving unit prices:', error)
    return NextResponse.json({
      error: '원가 데이터 저장 중 오류가 발생했습니다.',
      details: error.message
    }, { status: 500 })
  }
} 