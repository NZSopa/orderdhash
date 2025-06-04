import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getDB } from '@/app/lib/db'

export async function POST(request) {
  try {
    const data = await request.formData()
    const file = data.get('file')

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    // 파일 읽기
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    // 결과 카운터 초기화
    let totalCount = 0
    let newCount = 0
    let nzUpdateCount = 0
    let ausUpdateCount = 0

    const db = getDB()
    
    try {
      // 테이블이 없으면 생성
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

      // 컬럼명 자동 매핑 함수 추가
      function getColumnKey(keys, keyword) {
        return keys.find(k => k.toUpperCase().replace(/\s/g, '').includes(keyword));
      }

      const mapRow = (row) => {
        const keys = Object.keys(row);
        const codeKey = getColumnKey(keys, 'ALLNZCODE');
        const nameKey = getColumnKey(keys, 'PRODUCTNAME');
        const nzKey = getColumnKey(keys, 'NZ STOCK') || getColumnKey(keys, 'NZ재고');
        const ausKey = getColumnKey(keys, 'AUS STOCK') || getColumnKey(keys, 'AUS재고');

        return {
          product_code: codeKey ? row[codeKey] : '',
          product_name: nameKey ? row[nameKey] : '',
          nz_stock: nzKey ? Number(row[nzKey]) : 0,
          aus_stock: ausKey ? Number(row[ausKey]) : 0,
        };
      };

      const filtered = jsonData.map(mapRow).filter(r => r.product_code && r.product_name && (r.nz_stock || r.aus_stock));

      // 트랜잭션 시작
      const insertOrUpdate = db.transaction((items) => {
        const stmt = db.prepare(`
          INSERT INTO inventory (
            product_code, product_name, nz_stock, aus_stock, memo,
            updated_at, created_at
          ) VALUES (
            @product_code, @product_name, @nz_stock, @aus_stock, @memo,
            CURRENT_TIMESTAMP,
            COALESCE((SELECT created_at FROM inventory WHERE product_code = @product_code), CURRENT_TIMESTAMP)
          )
          ON CONFLICT(product_code) DO UPDATE SET
            product_name = COALESCE(@product_name, product_name),
            nz_stock = COALESCE(@nz_stock, nz_stock),
            aus_stock = COALESCE(@aus_stock, aus_stock),
            memo = COALESCE(@memo, memo),
            updated_at = CURRENT_TIMESTAMP
        `)

        for (const item of items) {
          totalCount++
          
          // 기존 데이터 확인
          const existing = db.prepare('SELECT * FROM inventory WHERE product_code = ?').get(item.product_code)
          
          if (!existing) {
            newCount++
          } else {
            if (existing.nz_stock !== item.nz_stock) nzUpdateCount++
            if (existing.aus_stock !== item.aus_stock) ausUpdateCount++
          }

          // 데이터 삽입 또는 업데이트
          stmt.run({
            product_code: item.product_code,
            product_name: item.product_name,
            nz_stock: item.nz_stock || 0,
            aus_stock: item.aus_stock || 0,
            memo: item.memo || null
          })
        }
      })

      // 트랜잭션 실행
      insertOrUpdate(filtered)

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
    console.error('Error processing inventory upload:', error)
    return NextResponse.json(
      { error: '파일 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 