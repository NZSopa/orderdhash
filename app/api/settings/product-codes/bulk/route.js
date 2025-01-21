import { NextResponse } from 'next/server'
import { getDB, closeDB } from '@/app/lib/db'

export async function POST(request) {
  try {
    const products = await request.json()
    const db = await getDB()
    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      errors: []
    }

    try {
      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      // 중복 체크를 위한 기존 코드 조회
      const existingCodes = db.prepare(`
        SELECT product_code 
        FROM product_master 
        WHERE product_code IN (${products.map(() => '?').join(',')})
      `).all(products.map(p => p.product_code))

      const existingCodeMap = new Map(existingCodes.map(c => [c.product_code, true]))

      // 제품 코드 일괄 등록
      const insertStmt = db.prepare(`
        INSERT INTO product_master (
          product_code, 
          product_name, 
          brand, 
          supplier, 
          image_url, 
          description, 
          barcode
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      for (const product of products) {
        try {
          if (existingCodeMap.has(product.product_code)) {
            results.failed++
            results.errors.push({
              product_code: product.product_code,
              reason: '이미 존재하는 제품 코드입니다.'
            })
            continue
          }

          if (!product.product_code || !product.product_name) {
            results.failed++
            results.errors.push({
              product_code: product.product_code || '없음',
              reason: '제품 코드와 제품명은 필수 입력 항목입니다.'
            })
            continue
          }

          insertStmt.run(
            product.product_code,
            product.product_name,
            product.brand || null,
            product.supplier || null,
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

      // 트랜잭션 커밋
      db.prepare('COMMIT').run()

      return NextResponse.json({ 
        success: true,
        results
      })
    } catch (error) {
      // 오류 발생 시 롤백
      db.prepare('ROLLBACK').run()
      throw error
    } finally {
      // 데이터베이스 연결 닫기
      closeDB()
    }
  } catch (error) {
    console.error('Error in bulk product code creation:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
} 