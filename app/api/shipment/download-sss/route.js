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

    
    const db = await getDB()
    
    // 출하 데이터 조회
    const shipments = db.prepare(`
      SELECT 
        s.shipment_no,
        s.consignee_name,
        s.kana,
        s.postal_code,
        s.address,
        s.phone_number,
        s.product_name,
        s.quantity,
        s.unit_value,
        s.weight,
        s.product_code,
        s.sku
      FROM shipment s
      WHERE s.shipment_no IS NOT NULL
      AND s.status = 'processing'
      AND s.shipment_location = ?
      ORDER BY s.shipment_no ASC
    `).all(location)


    // 엑셀 워크북 생성
    const wb = XLSX.utils.book_new()
    
    // 헤더 행
    const headers = [
      'reference No', 'AIRWAYBILL', 'Bag NO.', 'Consignees NAME', 'Consignees NAME 2',
      'ConsigneesPOST', 'Consignees Address', 'Consignees Address 2', 'ConsigneesPhonenumber',
      'Shippers Name', 'Shippers address', 'SHIPPERSTELNO.', 'TERM', 'Invoice total value nzd',
      'Number of parcels', 'WEIGHT (KG)', 'Item Description 1', 'Item Quantity', 'Unit Value(JPY)',
      'Country of Origin', 'Item\'s number', 'Item Description 2', 'Item Quantity', 'Unit Value',
      'Country of Origin', 'Item\'s number', 'Item Description 3', 'Item Quantity', 'Unit Value',
      'Country of Origin', 'Item\'s number', 'Item Description 4', 'Item Quantity', 'Unit Value',
      'Country of Origin', 'Item\'s number', 'Item Description 5', 'Item Quantity', 'Unit Value',
      'Country of Origin', 'Item\'s number'
    ]
    
    // 데이터 행 추가
    const rowData = shipments.map(shipment => [
      shipment.shipment_no,           // reference No
      '',                             // AIRWAYBILL
      '',                             // Bag NO.
      shipment.consignee_name,        // Consignees NAME
      shipment.kana,                  // Consignees NAME 2
      shipment.postal_code,           // ConsigneesPOST
      shipment.address,               // Consignees Address
      '',                             // Consignees Address 2
      shipment.phone_number,          // ConsigneesPhonenumber
      'International Network and Trading Ltd.,', // Shippers Name
      'Unit D3 27-29, William Pickering Drive Albany, Auckland, 0632', // Shippers address
      '021-0292-3057',               // SHIPPERSTELNO.
      '',                             // TERM
      (shipment.unit_value || 0) * (shipment.quantity || 0), // Invoice total value nzd
      1,                              // Number of parcels
      shipment.weight || '',          // WEIGHT (KG)
      shipment.product_name,          // Item Description 1
      shipment.quantity,              // Item Quantity
      shipment.unit_value,            // Unit Value(JPY)
      'NZ',                           // Country of Origin
      shipment.sku,
      '',                             // Item Description 2
      '',                             // Item Quantity
      '',                             // Unit Value
      '',                             // Country of Origin
      '',                             // Item's number
      '',                             // Item Description 3
      '',                             // Item Quantity
      '',                             // Unit Value
      '',                             // Country of Origin
      '',                             // Item's number
      '',                             // Item Description 4
      '',                             // Item Quantity
      '',                             // Unit Value
      '',                             // Country of Origin
      '',                             // Item's number
      '',                             // Item Description 5
      '',                             // Item Quantity
      '',                             // Unit Value
      '',                             // Country of Origin
      ''                              // Item's number
    ])
    
    // 모든 데이터 합치기
    const allData = [headers, ...rowData]
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(allData)
    
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(wb, ws, 'SSS')

    // 엑셀 파일 생성
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const today = new Date().toISOString().split('T')[0]
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=SSS_${location}_${today}.xlsx`
      }
    })
  } catch (error) {
    console.error('Error downloading SSS data:', error)
    return NextResponse.json(
      { error: 'SSS 데이터 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 