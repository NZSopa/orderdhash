import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'
import { read, utils } from 'xlsx'
import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

export async function POST(request) {
  return await withDB(async (db) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file')
      const type = formData.get('type')
      const shippingFee = type === 'amazon' ? parseInt(formData.get('shippingFee') || '0', 10) : 0

      if (!file) {
        return NextResponse.json(
          { success: false, message: '파일이 없습니다.' },
          { status: 400 }
        )
      }

      if (type === 'amazon' && isNaN(shippingFee)) {
        return NextResponse.json(
          { success: false, message: '유효하지 않은 배송비입니다.' },
          { status: 400 }
        )
      }

      let totalCount = 0
      let updatedCount = 0
      let failedCount = 0

      // 트랜잭션 시작
      db.prepare('BEGIN TRANSACTION').run()

      try {
        if (type === 'amazon') {
          // 아마존 가격 파일 처리
          const buffer = Buffer.from(await file.arrayBuffer())
          let data
          let isTabDelimited = false
          let isCSV = false
          // 파일명이 txt/csv이거나, 첫 1KB에 탭/쉼표가 많이 포함되어 있으면 구분자 판별
          if (file.name?.endsWith('.txt')) {
            isTabDelimited = true
          } else if (file.name?.endsWith('.csv')) {
            isCSV = true
          } else {
            const preview = buffer.slice(0, 1024).toString('utf8')
            if ((preview.match(/\t/g) || []).length > 10) {
              isTabDelimited = true
            } else if ((preview.match(/,/g) || []).length > 10) {
              isCSV = true
            }
          }

          if (isTabDelimited) {
            // 탭 구분 텍스트 파일 처리
            const content = buffer.toString('utf8')
            data = parse(content, {
              columns: true,
              skip_empty_lines: true,
              delimiter: '\t',
              trim: true,
              bom: true,
              relax_quotes: true,
              relax_column_count: true
            })
          } else if (isCSV) {
            // CSV 파일 처리
            const content = buffer.toString('utf8')
            data = parse(content, {
              columns: true,
              skip_empty_lines: true,
              delimiter: ',',
              trim: true,
              bom: true,
              relax_quotes: true,
              relax_column_count: true
            })
          } else {
            // 엑셀 파일 처리
            const workbook = read(buffer)
            const worksheet = workbook.Sheets[workbook.SheetNames[0]]
            data = utils.sheet_to_json(worksheet)
          }

          for (const row of data) {
            totalCount++
            const sales_sku = row['sku']?.toString() || row['出品者SKU']?.toString() || row['Custom label (SKU)']?.toString();
            const priceStr = row['price']?.toString() || row['価格']?.toString() || row['Current price']?.toString();
            const stockStr = row['quantity']?.toString() || row['数量']?.toString() || row['Available quantity']?.toString();

            if (!sales_sku || !priceStr || !stockStr) {
              failedCount++
              continue
            }

            let price
            try {
              price = parseFloat(priceStr.replace(/[¥,]/g, ''))
            } catch (error) {
              failedCount++
              continue
            }

            if (isNaN(price)) {
              failedCount++
              continue
            }

            const finalPrice = price + shippingFee

            try {
              const result = db.prepare(`
                UPDATE sales_listings 
                SET sales_price = ?, 
                    sales_qty = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE sales_sku = ?
              `).run(finalPrice, stockStr, sales_sku)

              if (result.changes > 0) {
                updatedCount++
              } else {
                failedCount++
              }
            } catch (error) {
              failedCount++
            }
          }
        } else if (type === 'yahoo') {
          // Yahoo 가격 파일 처리 (Shift-JIS 인코딩 처리)
          const buffer = await file.arrayBuffer()
          const content = iconv.decode(Buffer.from(buffer), 'Shift_JIS')
          
          // csv-parse를 사용하여 CSV 파싱
          const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
            relax_quotes: true,
            relax_column_count: true
          })

          for (const record of records) {
            totalCount++
            
            // code와 price 필드 추출
            const salesCode = record.code
            const priceStr = record.price

            console.log('Processing record:', {
              salesCode,
              priceStr,
              rawRecord: record
            })

            if (!salesCode || !priceStr) {
              console.log('Skipping record - missing data:', { salesCode, priceStr })
              failedCount++
              continue
            }

            let price
            try {
              // 쉼표와 ¥ 기호 제거 후 숫자로 변환
              price = parseInt(priceStr.replace(/[,¥]/g, ''), 10)
              
              if (isNaN(price)) {
                console.log('Invalid price format:', priceStr)
                failedCount++
                continue
              }
            } catch (error) {
              console.log('Error parsing price:', error)
              failedCount++
              continue
            }

            try {
              const result = db.prepare(`
                UPDATE sales_listings 
                SET sales_price = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE sales_code = ?
              `).run(price, salesCode)

              if (result.changes > 0) {
                console.log('Successfully updated:', { salesCode, price })
                updatedCount++
              } else {
                console.log('No matching record found:', { salesCode })
                failedCount++
              }
            } catch (error) {
              console.log('Database error:', error)
              failedCount++
            }
          }
        } else {
          throw new Error('지원하지 않는 파일 형식입니다.')
        }

        // 트랜잭션 커밋
        db.prepare('COMMIT').run()

        return NextResponse.json({
          success: true,
          totalCount,
          updatedCount,
          failedCount,
        })
      } catch (error) {
        // 오류 발생 시 롤백
        db.prepare('ROLLBACK').run()
        throw error
      }
    } catch (error) {
      console.error('Error processing file:', error)
      return NextResponse.json(
        { success: false, message: error.message || '파일 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 