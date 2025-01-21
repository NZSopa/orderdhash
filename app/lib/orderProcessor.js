import Papa from 'papaparse'
import iconv from 'iconv-lite'
import { getProductNameByCode } from './db'

export async function processOrders(files, orderType, db) {
  try {
    let orders = []
    
    if (orderType === 'yahoo') {
      const orderFile = files.find(file => file.name.startsWith('YahooOrder'))
      const productFile = files.find(file => file.name.startsWith('YahooProduct'))

      if (!orderFile || !productFile) {
        return { error: 'YahooOrder와 YahooProduct 파일이 모두 필요합니다.' }
      }

      const orderBuffer = Buffer.from(await orderFile.arrayBuffer())
      const productBuffer = Buffer.from(await productFile.arrayBuffer())
      
      const orderText = iconv.decode(orderBuffer, 'Shift_JIS')
      const productText = iconv.decode(productBuffer, 'Shift_JIS')

      orders = await processYahooOrder(orderText, productText, db)
    } else {
      const file = files[0]
      const buffer = Buffer.from(await file.arrayBuffer())
      const text = iconv.decode(buffer, 'Shift_JIS')
      orders = await processAmazonOrder(text, db)
    }

    if (!orders || orders.length === 0) {
      return { error: '처리할 주문 데이터가 없습니다.' }
    }

    // 기존 DB의 주문번호 목록 조회
    const existingOrders = db.prepare('SELECT reference_no FROM orders').all()
    const existingRefNos = new Set(existingOrders.map(order => order.reference_no))
    
    const duplicateErrors = []
    const validOrders = []
    
    for (const order of orders) {
      if (!order['reference No.']) continue
      
      if (existingRefNos.has(order['reference No.'])) {
        duplicateErrors.push({
          reference_no: order['reference No.'],
          error_type: 'duplicate',
          message: '이미 등록된 주문번호입니다.'
        })
      } else {
        validOrders.push({
          reference_no: order['reference No.'],
          sku: order['sku'],
          original_product_name: order['originalProductName'],
          quantity: parseInt(order['quantity-purchased']) || 1,
          unit_value: parseFloat(order['unit value']) || 0,
          consignee_name: order['Consignees NAME'],
          kana: order['Kana'],
          postal_code: order['postal_code'] || '',
          address: order['Consignees Address'],
          phone_number: order['ConsigneesPhonenumber'],
          created_at: new Date().toISOString()
        })
      }
    }

    // 유효한 주문만 저장
    if (validOrders.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO orders (
          reference_no, sku, original_product_name,
          quantity, unit_value, consignee_name, kana,
          postal_code, address, phone_number, created_at
        ) VALUES (
          @reference_no, @sku, @original_product_name,
          @quantity, @unit_value, @consignee_name, @kana,
          @postal_code, @address, @phone_number, @created_at
        )
      `)

      const insertMany = db.transaction((orders) => {
        for (const order of orders) {
          const orderData = {
            ...order,
            original_product_name: order.original_product_name || ''
          }
          stmt.run(orderData)
        }
      })

      insertMany(validOrders)
    }

    return {
      orders: validOrders,
      total: orders.length,
      success: validOrders.length,
      duplicateErrors,
      errors: duplicateErrors,
      summary: {
        total: orders.length,
        success: validOrders.length,
        error: duplicateErrors.length
      }
    }

  } catch (error) {
    console.error('Error in processOrders:', error)
    throw error
  }
}

async function processAmazonOrder(fileContent, db) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Processing Amazon order file...')
      
      Papa.parse(fileContent, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors)
            reject(new Error('CSV 파일 파싱 중 오류가 발생했습니다.'))
            return
          }

          const processedOrders = results.data
            .filter(order => order['order-id'])
            .map(order => {
              const productName = getProductNameByCode(db, order['sku'], order['product-name'])
              
              return {
                'reference No.': order['order-id'] || '',
                'sku': order['sku'] || '',
                'product-name': productName,
                'originalProductName': order['product-name'] || '',
                'quantity-purchased': order['quantity-purchased'] || '1',
                'Consignees NAME': order['recipient-name'] || '',
                'Kana': order['buyer-name'] || '',
                'postal_code': order['ship-postal-code'] || '',
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

          if (processedOrders.length === 0) {
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

async function processYahooOrder(orderContent, productContent, db) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Processing Yahoo order files...')

      Papa.parse(orderContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (orderResults) => {
          if (orderResults.errors && orderResults.errors.length > 0) {
            console.error('Order CSV parsing errors:', orderResults.errors)
            reject(new Error('주문 CSV 파일 파싱 중 오류가 발생했습니다.'))
            return
          }

          Papa.parse(productContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (productResults) => {
              if (productResults.errors && productResults.errors.length > 0) {
                console.error('Product CSV parsing errors:', productResults.errors)
                reject(new Error('상품 CSV 파일 파싱 중 오류가 발생했습니다.'))
                return
              }

              const orderDict = {}
              
              orderResults.data
                .filter(order => order.Id)
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

              const processedOrders = productResults.data
                .filter(product => product.Id && orderDict[product.Id])
                .map(product => {
                  const order = orderDict[product.Id]
                  const productName = getProductNameByCode(db, product.ItemId, product.Title)
                  
                  return {
                    'reference No.': product.Id || '',
                    'sku': product.ItemId || '',
                    'product-name': productName,
                    'originalProductName': product.Title || '',
                    'quantity-purchased': product.Quantity || '1',
                    'unit value': product.UnitPrice || '0',
                    'Consignees NAME': order.ShipName || '',
                    'Kana': order.ShipNameKana || '',
                    'postal_code': order.ShipZipCode || '',
                    'Consignees Address': [
                      order.ShipPrefecture,
                      order.ShipCity,
                      order.ShipAddress1,
                      order.ShipAddress2
                    ].filter(Boolean).join('') || '',
                    'ConsigneesPhonenumber': order.ShipPhoneNumber || '',
                  }
                })

              if (processedOrders.length === 0) {
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