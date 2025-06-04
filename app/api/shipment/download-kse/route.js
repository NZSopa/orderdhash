import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'
import * as XLSX from 'xlsx'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    if (!location || location === 'all') {
      return NextResponse.json(
        { error: '출하 위치를 선택해주세요.' },
        { status: 400 }
      )
    }

    if (location !== 'aus_kn') {
      return NextResponse.json(
        { error: 'KSE 다운로드는 AUS KN 출하만 가능합니다.' },
        { status: 400 }
      )
    }

    const db = await getDB()
    
    // 출하 데이터 조회
    const shipments = db.prepare(`
      SELECT 
        o.shipment_no,
        o.consignee_name,
        o.kana,
        o.postal_code,
        o.address,
        o.phone_number,
        o.product_name,
        o.quantity,
        o.weight,
        o.product_code,
        o.reference_no,
        o.site_url,
        o.sales_site,
        o.unit_value, 
        o.sku,
        o.set_qty
      FROM orders o
      WHERE o.shipment_no IS NOT NULL
      AND o.status = 'preparing'
      AND o.shipment_location = ?
      ORDER BY o.shipment_no ASC
    `).all(location)

    // 엑셀 워크북 생성
    const wb = XLSX.utils.book_new()
    
    // 헤더 행
    const headers = [
      'ORDER_NO1', 'ORDER_NO2', 'SHIPPING_TYPE', 'SENDER_NAME', 'SENDER_ADDRESS',
      'SENDER_PHONENO', 'RECEIVER_NAME', 'YOMIGANA', 'RECEIVER_ADDRESS',
      'RECEIVER_ZIPCODE', 'RECEIVER_PHONENO', 'RECEIVER_EMAILID', 'DELIVERY_DATE',
      'DELIVERY_TIME', 'BOX_COUNT', 'WEIGHT', 'COD_AMOUNT', 'WIDTH', 'LENGTH',
      'HEIGHT', 'UPLOAD_DATE', 'USER_DATA', 'CURRENCY UNIT', 'ITEM_CODE',
      'ITEM_NAME', 'MATERIAL', 'ITEM_COUNT', 'UNIT_PRICE', 'ITEM_ORIGIN','PURCHASE_URL', 'SALES_SITE',
      'PRODUCT_ORDERNO', 'HSCODE', 'OPTION', 'OPTION_CODE'
    ]
    
    // 데이터 행 추가
    const rowData = shipments.map(shipment => [
      shipment.shipment_no,           // ORDER_NO1
      '',                             // ORDER_NO2
      'KSE',                          // SHIPPING_TYPE
      'International Network and Trading Ltd.,', // SENDER_NAME
      'Unit D3 27-29, William Pickering Drive Albany, Auckland, 0632', // SENDER_ADDRESS
      '021-0292-3057',               // SENDER_PHONENO
      shipment.consignee_name,        // RECEIVER_NAME
      shipment.kana,                  // YOMIGANA
      shipment.address,               // RECEIVER_ADDRESS
      shipment.postal_code,           // RECEIVER_ZIPCODE
      shipment.phone_number,          // RECEIVER_PHONENO
      '',                             // RECEIVER_EMAILID
      '',                             // DELIVERY_DATE
      '',                             // DELIVERY_TIME
      1,                              // BOX_COUNT
      shipment.weight || '',          // WEIGHT
      0,                              // COD_AMOUNT
      10,                             // WIDTH
      10,                             // LENGTH
      10,                             // HEIGHT
      '',                             // UPLOAD_DATE
      '',                             // USER_DATA
      'JPY',                          // CURRENCY UNIT
      shipment.sku,                   // ITEM_CODE
      (shipment.set_qty > 1 ? `${shipment.product_name} ${shipment.set_qty} SETS` : shipment.product_name),          // ITEM_NAME
      '',                             // MATERIAL
      shipment.quantity,              // ITEM_COUNT
      shipment.unit_value,            // UNIT_VALUE
      "NZ",
      shipment.site_url,              // PURCHASE_URL
      // SALES_SITE 조건부 처리
      ['NZP', 'SKY', 'ARH'].includes(shipment.sales_site) ? 'Amazon' :
      shipment.sales_site === 'YAH' ? 'Yahoo' : '',
      shipment.reference_no,          // PRODUCT_ORDERNO
      '',                             // HSCODE
      '',                             // OPTION
      ''                              // OPTION_CODE
    ])
    
    // 모든 데이터 합치기
    const allData = [headers, ...rowData]
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(allData)
    
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, 'KSE')

    // 엑셀 파일 생성
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const today = new Date().toISOString().split('T')[0]
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=KSE_${location}_${today}.xlsx`
      }
    })
  } catch (error) {
    console.error('Error downloading KSE data:', error)
    return NextResponse.json(
      { error: 'KSE 데이터 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 