import { NextResponse } from 'next/server'
import { fetchPriceData } from '@/app/lib/fetchSheetData'

// GET /api/unit-prices/sheet - 구글 시트에서 가격정보 불러오기
export async function GET(request) {
  try {
    const data = await fetchPriceData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching price sheet data:', error);
    return NextResponse.json({ data: [], error: '구글 시트 가격정보 불러오기 실패' }, { status: 500 });
  }
}

// POST /api/unit-prices/sheet - 구글 시트에서 불러온 가격정보를 DB(Products_UnitPrice 테이블)에 저장하기
export async function POST(request) {
  const db = require('@/app/lib/db').getDB();
  try {
    const { data } = await request.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: '저장할 데이터가 없습니다.' }, { status: 400 });
    }

    // 월별 컬럼 정규식 (YYYY/MM 또는 YYYY/M 또는 YYYY-MM)
    const monthColPattern = /^(\d{4})[-\/]?(0?[1-9]|1[0-2])$/i;

    // 헤더 추출 (첫 row의 키)
    const headers = Object.keys(data[0] || {});
    const monthHeaders = headers.filter(h => monthColPattern.test(h.replace(/\s/g, '').replace('월','')));

    // upsert 쿼리
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_unit_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_code TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        year_month TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unitprice_code_month ON product_unit_prices(product_code, year_month);
    `);
    const stmt = db.prepare(`
      INSERT INTO product_unit_prices (product_code, price, year_month, created_at, updated_at)
      VALUES (@product_code, @price, @year_month, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(product_code, year_month) DO UPDATE SET
        price = excluded.price,
        updated_at = CURRENT_TIMESTAMP
    `);

    let successCount = 0;
    let failCount = 0;
    let errors = [];
    let total = 0;
    for (const row of data) {
      const product_code = row['ALLNZ CODE'] || row['AllNZ CODE'] || row['allnz code'] || row['제품 코드'] || row['product_code'] || '';
      if (!product_code) continue;
      for (const monthHeader of monthHeaders) {
        let priceRaw = row[monthHeader];
        // $ 등 기호 제거, 공백 제거, 숫자만 추출
        let price = typeof priceRaw === 'string' ? priceRaw.replace(/[^0-9.]/g, '') : priceRaw;
        if (price === undefined || price === null || price === '' || isNaN(Number(price))) continue;
        // 년월 포맷 변환 (YYYY/MM, YYYY-M 등 -> YYYY-MM)
        const match = monthHeader.replace(/\s/g, '').replace('월','').match(monthColPattern);
        if (!match) continue;
        const year = match[1];
        const month = match[2].toString().padStart(2, '0');
        const year_month = `${year}-${month}`;
        try {
          stmt.run({ product_code, price: Number(price), year_month });
          successCount++;
        } catch (e) {
          failCount++;
          errors.push({ product_code, year_month, price, error: e.message });
        }
        total++;
      }
    }

    if (total === 0) {
      return NextResponse.json({ error: '유효한 월별 가격 데이터가 없습니다.' }, { status: 400 });
    }

    return NextResponse.json({
      success: failCount === 0,
      total,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error saving price sheet data:', error);
    return NextResponse.json({ error: 'DB 저장 중 오류 발생' }, { status: 500 });
  }
} 