import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'
import Papa from 'papaparse'

// 날짜 형식 변환 함수
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // M/D/YYYY 또는 MM/DD/YYYY 형식 처리
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  // 다른 형식의 경우 Date 객체로 파싱 시도
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

export async function POST(request) {
  try {
    const db = getDB()
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    // 파일 내용 읽기
    const text = await file.text()
    
    // CSV 파싱
    const { data, errors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true
    })

    if (errors.length > 0) {
      return NextResponse.json({ error: 'CSV 파일 파싱 중 오류가 발생했습니다.' }, { status: 400 })
    }

    // 데이터 검증 및 날짜 형식 변환
    const validData = data.filter(row => {
      // 날짜 형식 변환
      const parsedDate = parseDate(row.ORDER_DATE);
      const parsedDate_settlement  = parseDate(row.SETTLEMENT_MONTH);
      const parsedDate_cost_basis = parseDate(row.COST_BASIS_MONTH);
      if (!parsedDate || !parsedDate_settlement || !parsedDate_cost_basis) return false;
      row.order_date = parsedDate;
      row.settlement_month = parsedDate_settlement;
      row.cost_basis_month = parsedDate_cost_basis;


      return row.ORDER_NUMBER && row.SALES_SITE && row.PRODUCT_CODE && 
             row.PRODUCT_NAME && row.QUANTITY && row.SALES_PRICE 
    })

    if (validData.length === 0) {
      return NextResponse.json({ error: '유효한 데이터가 없습니다.' }, { status: 400 })
    }

    // 기존 데이터 삭제
    await db.prepare('DELETE FROM order_summary').run()

    // 새 데이터 삽입
    const insertStmt = db.prepare(`
      INSERT INTO order_summary (
        order_date,
        shipment_number,
        customer_name,
        product_code,
        product_name,
        quantity,
        weight,
        sales_site,
        settlement_month,
        order_number,
        sales_price,
        amazon_commission,
        yahoo_commission,
        japan_company_commission,
        deposit_amount_jpy,
        exchange_rate,
        deposit_amount_nzd,
        purchase_cost,
        shipping_fee,
        profit,
        cost_basis_month,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        insertStmt.run(
          parseDate(row.ORDER_DATE),
          row.SHIPMENT_NUMBER || null,
          row.CUSTOMER_NAME || null,
          row.PRODUCT_CODE,
          row.PRODUCT_NAME,
          parseInt(row.QUANTITY.replace(/[^0-9]/g, '')) || 0,
          parseFloat(row.WEIGHT.replace(/[^0-9.]/g, '')) || 0,
          row.SALES_SITE,
          parseDate(row.SETTLEMENT_MONTH),
          row.ORDER_NUMBER,
          parseInt(row.SALES_PRICE.replace(/[^0-9]/g, '')) || 0,
          parseInt(row.AMAZON_COMMISSION.replace(/[^0-9]/g, '')) || 0,
          parseInt(row.YAHOO_COMMISSION.replace(/[^0-9]/g, '')) || 0,
          parseInt(row.JAPAN_COMPANY_COMMISSION.replace(/[^0-9]/g, '')) || 0,
          parseInt(row.DEPOSIT_AMOUNT_JPY.replace(/[^0-9]/g, '')) || 0,
          parseFloat(row.EXCHANGE_RATE.replace(/[^0-9.]/g, '')) || 0,
          parseFloat(row.DEPOSIT_AMOUNT_NZD.replace(/[^0-9.]/g, '')) || 0,
          parseFloat(row.PURCHASE_COST.replace(/[^0-9.]/g, '')) || 0,
          parseFloat(row.SHIPPING_FEE.replace(/[^0-9.]/g, '')) || 0,
          parseFloat(row.PROFIT.replace(/[^0-9.]/g, '')) || 0,
          parseDate(row.COST_BASIS_MONTH) || null,
          row.STATUS || null
        )
      }
    })

    insertMany(validData)

    return NextResponse.json({
      message: `${validData.length}건의 데이터가 업로드되었습니다.`
    })
  } catch (error) {
    console.error('Error uploading orders:', error)
    return NextResponse.json({ error: '주문 데이터 업로드 중 오류가 발생했습니다.' }, { status: 500 })
  }
} 