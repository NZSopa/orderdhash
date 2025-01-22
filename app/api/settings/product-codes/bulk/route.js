import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function POST(request) {
  try {
    const products = await request.json()
    
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않은 데이터입니다.' },
        { status: 400 }
      )
    }

    return await withDB(async (db) => {
      const results = {
        total: products.length,
        success: 0,
        failed: 0,
        errors: []
      }

      db.prepare('BEGIN TRANSACTION').run()

      try {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO product_master (
            product_code,
            product_name,
            brand,
            supplier,
            shipping_from,
            image_url,
            description,
            barcode,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `)

        for (const product of products) {
          try {
            stmt.run(
              product.product_code,
              product.product_name,
              product.brand || null,
              product.supplier || null,
              product.shipping_from || null,
              product.image_url || null,
              product.description || null,
              product.barcode || null
            )
            results.success++
          } catch (error) {
            results.failed++
            results.errors.push({
              product_code: product.product_code,
              reason: error.message
            })
          }
        }

        if (results.failed === 0) {
          db.prepare('COMMIT').run()
        } else {
          db.prepare('ROLLBACK').run()
          return NextResponse.json(
            { 
              error: '일부 데이터 처리 중 오류가 발생했습니다.',
              results 
            },
            { status: 400 }
          )
        }

        return NextResponse.json({ 
          message: '일괄 등록이 완료되었습니다.',
          results 
        })
      } catch (error) {
        db.prepare('ROLLBACK').run()
        throw error
      }
    })
  } catch (error) {
    console.error('일괄 등록 오류:', error)
    return NextResponse.json(
      { error: '일괄 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 