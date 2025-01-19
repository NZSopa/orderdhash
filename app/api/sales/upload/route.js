import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const channel = formData.get('channel')

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    // 파일 내용을 텍스트로 읽기
    const text = await file.text()
    const lines = text.split('\n')
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: '파일에 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    // 헤더 행에서 필드 인덱스 찾기
    const headers = lines[0].split('\t')
    const skuIndex = headers.findIndex(h => h === '出品者SKU')
    const priceIndex = headers.findIndex(h => h === '価格')
    const qtyIndex = headers.findIndex(h => h === '数量')

    // 필수 필드 확인
    if (skuIndex === -1 || priceIndex === -1 || qtyIndex === -1) {
      return NextResponse.json(
        { 
          error: '필수 필드가 누락되었습니다. 필요한 필드: 出品者SKU, 価格, 数量',
          missingFields: {
            sku: skuIndex === -1,
            price: priceIndex === -1,
            qty: qtyIndex === -1
          }
        },
        { status: 400 }
      )
    }

    const db = getDB()
    
    // product_code 조회 준비
    const getProductCode = db.prepare('SELECT product_code FROM Product_Codes WHERE sales_sku = ?')

    // 판매 데이터 삽입 준비
    const insertSale = db.prepare(`
      INSERT INTO Sales (
        sales_sku,
        product_code,
        sales_price,
        qty,
        sales_channel
      ) VALUES (?, ?, ?, ?, ?)
    `)

    // 데이터 파싱 및 검증
    const sales = []
    const errors = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const fields = line.split('\t')
      const site_sku = fields[skuIndex]?.trim()
      const price = parseFloat(fields[priceIndex]?.replace(/[^0-9.-]+/g, ''))
      const qty = parseInt(fields[qtyIndex], 10)

      // 데이터 유효성 검사
      if (!site_sku) {
        errors.push(`${i + 1}번째 행: SKU가 비어있습니다.`)
        continue
      }
      if (isNaN(price)) {
        errors.push(`${i + 1}번째 행: 가격이 올바르지 않습니다.`)
        continue
      }
      if (isNaN(qty)) {
        errors.push(`${i + 1}번째 행: 수량이 올바르지 않습니다.`)
        continue
      }

      const productCodeResult = getProductCode.get(site_sku)
      if (!productCodeResult) {
        errors.push(`${i + 1}번째 행: SKU(${site_sku})에 해당하는 제품 코드를 찾을 수 없습니다.`)
        continue
      }

      sales.push({
        sales_sku: site_sku,  // site_sku를 sales_sku로 사용
        product_code: productCodeResult.product_code,
        sales_price: price,
        qty,
        channel
      })
    }

    // 오류가 있는 경우 처리 중단
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: '데이터 처리 중 오류가 발생했습니다.',
        details: errors
      }, { status: 400 })
    }

    // 데이터가 없는 경우
    if (sales.length === 0) {
      return NextResponse.json({
        success: false,
        error: '처리할 데이터가 없습니다.'
      }, { status: 400 })
    }

    // 트랜잭션으로 데이터 삽입
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertSale.run(
          item.sales_sku,
          item.product_code,
          item.sales_price,
          item.qty,
          item.channel
        )
      }
    })

    // 데이터 삽입 실행
    insertMany(sales)

    return NextResponse.json({
      success: true,
      message: `${sales.length}개의 판매 데이터가 업로드되었습니다.`
    })
  } catch (error) {
    console.error('Error processing upload:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '파일 처리 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
} 