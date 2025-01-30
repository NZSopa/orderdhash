import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'
import Papa from 'papaparse'

export async function GET(request) {
  try {

    // CSV 파일 생성 - 헤더만 포함
    const csv = Papa.unparse({
      fields: [
        'DATE', //order_date
        'SHIPMENT_NUMBER', //shipment_number  
        'CUSTOMER_NAME', //customer_name
        'PRODUCT_CODE', //product_code
        'PRODUCT_NAME', //product_name
        'QUANTITY', //quantity
        'WEIGHT', //weight
        'SALES_SITE', //sales_site
        'SETTLEMENT_MONTH', //settlement_month
        'ORDER_ID', //order_id
        'SALES_PRICE', //sales_price
        'AMAZON_COMMISSION', //amazon_commission
        'YAHOO_COMMISSION', //yahoo_commission 
        'JAPAN_COMPANY_COMMISSION', //japan_company_commission
        'DEPOSIT_AMOUNT_JPY', //deposit_amount_jpy
        'EXCHANGE_RATE', //exchange_rate
        'DEPOSIT_AMOUNT_NZD', //deposit_amount_nzd
        'PURCHASE_COST', //purchase_cost
        'SHIPPING_FEE', //shipping_fee
        'PROFIT', //profit
        'COST_BASIS_MOTH', //cost_basis_month
      ],
      data: []  // 빈 데이터 배열
    })

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const buffer = Buffer.from('\ufeff' + csv)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=order_summary_template.csv`
      }
    })
  } catch (error) {
    console.error('Error downloading template:', error)
    return NextResponse.json({ error: '템플릿 다운로드 중 오류가 발생했습니다.' }, { status: 500 })
  }
} 