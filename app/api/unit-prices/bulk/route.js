import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function POST(req) {
  try {
    const db = getDB()
    const body = await req.json()
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO product_unit_prices (
        product_code, year_month, price, memo, updated_at
      ) VALUES (
        @product_code, @year_month, @price, @memo,
        CURRENT_TIMESTAMP
      )
    `)

    if (Array.isArray(body.prices)) {
      let processedCount = 0
      let errorCount = 0
      const errors = []

      // 일괄 저장
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          try {
            // 년월 형식 변환 (YYYY-MM -> YYYY/MM)
            const yearMonth = item.year_month.replace('-', '/')
            const data = {
              ...item,
              year_month: year_month
            }
            stmt.run(data)
            processedCount++
          } catch (error) {
            errorCount++
            errors.push({
              item,
              error: error.message
            })
          }
        }
      })

      insertMany(body.prices)

      return NextResponse.json({ 
        message: '원가 데이터가 저장되었습니다.',
        success: true,
        total: body.prices.length,
        processed: processedCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined
      })
    } else {
      return NextResponse.json(
        { error: '저장할 데이터가 없습니다.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error saving unit prices:', error)
    return NextResponse.json(
      { error: '원가 데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 