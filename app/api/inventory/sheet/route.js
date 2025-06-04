import { NextResponse } from 'next/server'
import { fetchStockData } from '@/app/lib/fetchSheetData'
import { getDB } from '@/app/lib/db'

// GET /api/inventory/sheet - 구글 시트에서 재고 불러오기
export async function GET(request) {
  try {
    const data = await fetchStockData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return NextResponse.json({ data: [], error: '구글 시트 데이터 불러오기 실패' }, { status: 500 });
  }
}

// POST /api/inventory/sheet - 구글 시트 데이터 DB 저장
export async function POST(request) {
  try {
    const { data } = await request.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: '저장할 데이터가 없습니다.' }, { status: 400 });
    }

    // 컬럼명 매핑
    const mapRow = (row) => {
      return {
        product_code: row['ALLNZ CODE'] || row['AllNZ CODE'] || row['allnz code'] || '',
        product_name: row['PRODUCT NAME'] || row['Product Name'] || row['product name'] || '',
        nz_stock: Number(row['NZ STOCK'] || row['NZ재고'] || row['NZ 재고'] || row['뉴질랜드재고'] || 0),
        aus_stock: Number(row['AUS STOCK'] || row['AUS재고'] || row['AUS 재고'] || row['호주재고'] || 0),
      }
    }
    // 숫자가 입력된 것만 필터
    const filtered = data.map(mapRow).filter(r => r.product_code && r.product_name && (r.nz_stock || r.aus_stock))

    if (filtered.length === 0) {
      return NextResponse.json({ error: '저장할 데이터가 없습니다.' }, { status: 400 });
    }

    const db = getDB()
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS inventory (
          product_code TEXT PRIMARY KEY,
          product_name TEXT NOT NULL,
          nz_stock INTEGER DEFAULT 0,
          aus_stock INTEGER DEFAULT 0,
          memo TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      const insertOrUpdate = db.transaction((items) => {
        const stmt = db.prepare(`
          INSERT INTO inventory (
            product_code, product_name, nz_stock, aus_stock,
            updated_at, created_at
          ) VALUES (
            @product_code, @product_name, @nz_stock, @aus_stock,
            CURRENT_TIMESTAMP,
            COALESCE((SELECT created_at FROM inventory WHERE product_code = @product_code), CURRENT_TIMESTAMP)
          )
          ON CONFLICT(product_code) DO UPDATE SET
            product_name = COALESCE(@product_name, product_name),
            nz_stock = COALESCE(@nz_stock, nz_stock),
            aus_stock = COALESCE(@aus_stock, aus_stock),
            updated_at = CURRENT_TIMESTAMP
        `)
        for (const item of items) {
          stmt.run(item)
        }
      })
      insertOrUpdate(filtered)
      const totalCount = filtered.length
      const newCount = filtered.length
      const nzUpdateCount = filtered.length
      const ausUpdateCount = filtered.length
      return NextResponse.json({
        success: true,
        totalCount,
        newCount,
        nzUpdateCount,
        ausUpdateCount
      })
    } finally {
      db.close()
    }
  } catch (error) {
    console.error('Error saving sheet data:', error)
    return NextResponse.json({ error: 'DB 저장 중 오류 발생' }, { status: 500 })
  }
} 