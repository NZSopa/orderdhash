import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import iconv from 'iconv-lite'
import { saveOrders, saveFileUpload } from '@/app/lib/db'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const orderType = formData.get('orderType')
    const files = formData.getAll('files')

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    const processedData = []

    if (orderType === 'yahoo') {
      // 야후 주문 처리
      const orderFile = files.find(file => file.name.startsWith('YahooOrder'))
      const productFile = files.find(file => file.name.startsWith('YahooProduct'))

      if (!orderFile || !productFile) {
        return NextResponse.json(
          { error: 'YahooOrder와 YahooProduct 파일이 모두 필요합니다.' },
          { status: 400 }
        )
      }

      try {
        const orderBuffer = Buffer.from(await orderFile.arrayBuffer())
        const productBuffer = Buffer.from(await productFile.arrayBuffer())
        
        const orderText = iconv.decode(orderBuffer, 'Shift_JIS')
        const productText = iconv.decode(productBuffer, 'Shift_JIS')

        const data = await processYahooOrder(orderText, productText)
        if (!data || data.length === 0) {
          throw new Error('주문 데이터를 처리할 수 없습니다.')
        }
        processedData.push(...data)

        // 파일 업로드 이력 저장
        await saveFileUpload(orderFile.name, 'yahoo', 'success', data.length)
        await saveFileUpload(productFile.name, 'yahoo', 'success', data.length)
      } catch (error) {
        console.error('Error processing Yahoo files:', error)
        return NextResponse.json(
          { error: `야후 주문 처리 중 오류: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      // 아마존 주문 처리
      try {
        for (const file of files) {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const text = iconv.decode(buffer, 'Shift_JIS')
          
          const data = await processAmazonOrder(text)
          if (!data || data.length === 0) {
            throw new Error('주문 데이터를 처리할 수 없습니다.')
          }
          processedData.push(...data)

          // 파일 업로드 이력 저장
          await saveFileUpload(file.name, 'amazon', 'success', data.length)
        }
      } catch (error) {
        console.error('Error processing Amazon files:', error)
        return NextResponse.json(
          { error: `아마존 주문 처리 중 오류: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // 주문 데이터 저장
    if (processedData.length > 0) {
      try {
        await saveOrders(processedData, orderType)
      } catch (error) {
        console.error('Error saving orders:', error)
        return NextResponse.json(
          { error: `주문 데이터 저장 중 오류: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: '처리할 주문 데이터가 없습니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: processedData,
      message: '파일 처리가 완료되었습니다.',
      count: processedData.length
    })
  } catch (error) {
    console.error('Error in order processing:', error)
    return NextResponse.json(
      { error: `파일 처리 중 오류가 발생했습니다: ${error.message}` },
      { status: 500 }
    )
  }
}

async function processAmazonOrder(fileContent) {
  return new Promise((resolve, reject) => {
    try {
      // 디버깅을 위한 파일 내용 로깅
      console.log('File content preview:', fileContent.substring(0, 200))
      
      Papa.parse(fileContent, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        transformHeader: (header) => {
          // 헤더 이름 디버깅
          console.log('Found header:', header)
          return header.trim()
        },
        complete: (results) => {
          // 파싱 결과 디버깅
          console.log('Parsing results:', {
            errors: results.errors,
            totalRows: results.data.length,
            headers: results.meta.fields
          })

          if (results.errors && results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors)
            reject(new Error('CSV 파일 파싱 중 오류가 발생했습니다.'))
            return
          }

          const processedOrders = results.data
            .filter(order => {
              // 필터링 디버깅
              if (!order['order-id']) {
                console.log('Filtered out order:', order)
              }
              return order['order-id']
            })
            .map(order => {
              // 데이터 매핑 디버깅
              console.log('Processing order:', order['order-id'])
              
              return {
                'reference No.': order['order-id'] || '',
                'sku': order['sku'] || '',
                'product-name': order['product-name'] || '',
                'quantity-purchased': order['quantity-purchased'] || '1',
                'Consignees NAME': order['recipient-name'] || '',
                'Kana': order['buyer-name'] || '',
                'ConsigneesPOST': order['ship-postal-code'] || '',
                'Consignees Address': [
                  order['ship-state'],
                  order['ship-city'],
                  order['ship-address-1'],
                  order['ship-address-2'],
                  order['ship-address-3']
                ].filter(Boolean).join(' ').trim() || '',
                'ConsigneesPhonenumber': order['buyer-phone-number'] || '',
                'unit value': order['item-price'] || '0'
              }
            })

          // 최종 결과 디버깅
          console.log('Processed orders count:', processedOrders.length)
          if (processedOrders.length === 0) {
            console.log('No valid orders found in the file')
            reject(new Error('처리할 주문 데이터가 없습니다.'))
            return
          }

          resolve(processedOrders)
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          reject(new Error('CSV 파일 파싱 중 오류가 발생했습니다.'))
        }
      })
    } catch (error) {
      console.error('Error in processAmazonOrder:', error)
      reject(error)
    }
  })
}

async function processYahooOrder(orderContent, productContent) {
  return new Promise((resolve, reject) => {
    try {
      // 디버깅을 위한 파일 내용 로깅
      console.log('Order file preview:', orderContent.substring(0, 200))
      console.log('Product file preview:', productContent.substring(0, 200))

      Papa.parse(orderContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // 헤더 이름 디버깅
          console.log('Order header:', header)
          return header.trim()
        },
        complete: (orderResults) => {
          // 주문 파일 파싱 결과 디버깅
          console.log('Order parsing results:', {
            errors: orderResults.errors,
            totalRows: orderResults.data.length,
            headers: orderResults.meta.fields
          })

          if (orderResults.errors && orderResults.errors.length > 0) {
            console.error('Order CSV parsing errors:', orderResults.errors)
            reject(new Error('주문 CSV 파일 파싱 중 오류가 발생했습니다.'))
            return
          }

          Papa.parse(productContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => {
              // 헤더 이름 디버깅
              console.log('Product header:', header)
              return header.trim()
            },
            complete: (productResults) => {
              // 상품 파일 파싱 결과 디버깅
              console.log('Product parsing results:', {
                errors: productResults.errors,
                totalRows: productResults.data.length,
                headers: productResults.meta.fields
              })

              if (productResults.errors && productResults.errors.length > 0) {
                console.error('Product CSV parsing errors:', productResults.errors)
                reject(new Error('상품 CSV 파일 파싱 중 오류가 발생했습니다.'))
                return
              }

              const orderDict = {}
              
              // 주문 데이터 처리 디버깅
              console.log('Processing orders...')
              orderResults.data
                .filter(order => {
                  if (!order.Id) {
                    console.log('Filtered out order:', order)
                    return false
                  }
                  return true
                })
                .forEach(order => {
                  orderDict[order.Id] = {
                    ShipName: order.ShipName || '',
                    ShipNameKana: order.ShipNameKana || '',
                    ShipZipCode: order.ShipZipCode || '',
                    ShipPrefecture: order.ShipPrefecture || '',
                    ShipCity: order.ShipCity || '',
                    ShipAddress1: order.ShipAddress1 || '',
                    ShipAddress2: order.ShipAddress2 || '',
                    ShipPhoneNumber: order.ShipPhoneNumber || '',
                  }
                })

              // 주문 딕셔너리 디버깅
              console.log('Order dictionary size:', Object.keys(orderDict).length)

              const processedOrders = productResults.data
                .filter(product => {
                  if (!product.Id || !orderDict[product.Id]) {
                    console.log('Filtered out product:', product)
                    return false
                  }
                  return true
                })
                .map(product => {
                  const order = orderDict[product.Id]
                  // 개별 주문 처리 디버깅
                  console.log('Processing order ID:', product.Id)
                  
                  return {
                    'reference No.': product.Id || '',
                    'sku': product.ItemId || '',
                    'product-name': product.Title || '',
                    'quantity-purchased': product.Quantity || '1',
                    'unit value': product.UnitPrice || '0',
                    'Consignees NAME': order.ShipName || '',
                    'Kana': order.ShipNameKana || '',
                    'ConsigneesPOST': order.ShipZipCode || '',
                    'Consignees Address': [
                      order.ShipPrefecture,
                      order.ShipCity,
                      order.ShipAddress1,
                      order.ShipAddress2
                    ].filter(Boolean).join('') || '',
                    'ConsigneesPhonenumber': order.ShipPhoneNumber || '',
                  }
                })

              // 최종 결과 디버깅
              console.log('Processed orders count:', processedOrders.length)
              if (processedOrders.length === 0) {
                console.log('No valid orders found in the files')
                reject(new Error('처리할 주문 데이터가 없습니다.'))
                return
              }

              resolve(processedOrders)
            },
            error: (error) => {
              console.error('Product CSV parsing error:', error)
              reject(new Error('상품 CSV 파일 파싱 중 오류가 발생했습니다.'))
            }
          })
        },
        error: (error) => {
          console.error('Order CSV parsing error:', error)
          reject(new Error('주문 CSV 파일 파싱 중 오류가 발생했습니다.'))
        }
      })
    } catch (error) {
      console.error('Error in processYahooOrder:', error)
      reject(error)
    }
  })
} 