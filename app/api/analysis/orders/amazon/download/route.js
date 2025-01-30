import { NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function GET(request) {
  try {
    // CSV 파일 생성 - 헤더만 포함
    const csv = Papa.unparse({
      fields: [
        'Date', //order_date
        'Transaction type', //settlement_type
        'Order ID', //order_id
        'Other', //other deposit 
        'Product Details', //product_original_name
        'Total product charges', //sales_price
        'Amazon fees', //amazon_fee
        'Total (JPY)', //deposit_amount_jpy
      ],
      data: []  // 빈 데이터 배열
    })

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const buffer = Buffer.from('\ufeff' + csv)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=amazon_order_template.csv`
      }
    })
  } catch (error) {
    console.error('Error downloading template:', error)
    return NextResponse.json({ error: 'Amazon 템플릿 다운로드 중 오류가 발생했습니다.' }, { status: 500 })
  }
} 