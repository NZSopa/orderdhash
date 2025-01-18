import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function POST(request) {
  const db = getDB()
  const formData = await request.formData()
  const file = formData.get('file')
  const shippingFee = parseInt(formData.get('shippingFee') || '0', 10)

  if (!file) {
    return NextResponse.json(
      { success: false, message: '파일이 없습니다.' },
      { status: 400 }
    )
  }

  if (isNaN(shippingFee)) {
    return NextResponse.json(
      { success: false, message: '유효하지 않은 배송비입니다.' },
      { status: 400 }
    )
  }

  try {
    const fileContent = await file.text()
    const lines = fileContent.split('\n')
    
    let totalCount = 0
    let updatedCount = 0
    let failedCount = 0

    // 트랜잭션 시작
    db.exec('BEGIN TRANSACTION')

    try {
      // 헤더 라인 건너뛰기
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue // 빈 라인 건너뛰기
        
        totalCount++
        const fields = line.split('\t') // 탭으로 구분된 필드

        // 필드가 충분한지 확인
        if (!fields || fields.length < 3) { // 최소 3개 필드 필요 (SKU, ASIN, 가격)
          console.log(`필드 수가 부족한 라인 ${i + 1}:`, line)
          failedCount++
          continue
        }

        const salesCode = fields[0]?.trim() // SKU는 첫 번째 필드
        const priceStr = fields[2]?.trim() // 가격은 세 번째 필드

        // 필수 필드가 없거나 빈 값인 경우 건너뛰기
        if (!salesCode || !priceStr) {
          console.log(`필수 필드 누락된 라인 ${i + 1}:`, line)
          failedCount++
          continue
        }

        // 가격에서 ¥ 기호와 쉼표 제거 후 숫자로 변환
        let price
        try {
          price = parseFloat(priceStr.replace(/[¥,]/g, ''))
        } catch (error) {
          console.log(`가격 변환 실패한 라인 ${i + 1}:`, line)
          failedCount++
          continue
        }

        if (isNaN(price)) {
          console.log(`유효하지 않은 가격 형식 라인 ${i + 1}:`, line)
          failedCount++
          continue
        }

        // 배송비 추가
        const finalPrice = price + shippingFee

        try {
          const result = db.prepare(`
            UPDATE product_codes 
            SET sales_price = ?, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE sales_code = ?
          `).run(finalPrice, salesCode)

          if (result.changes > 0) {
            updatedCount++
          } else {
            console.log(`매칭되는 상품 코드 없음 ${i + 1}:`, salesCode)
            failedCount++
          }
        } catch (error) {
          console.log(`DB 업데이트 실패한 라인 ${i + 1}:`, error)
          failedCount++
        }
      }

      // 트랜잭션 커밋
      db.exec('COMMIT')

      return NextResponse.json({
        success: true,
        totalCount,
        updatedCount,
        failedCount,
      })
    } catch (error) {
      // 오류 발생 시 롤백
      db.exec('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json(
      { success: false, message: '파일 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 