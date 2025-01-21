import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'
import { processOrders } from '@/app/lib/orderProcessor'

export async function POST(request) {
  let db = null
  
  try {
    db = await getDB()
    
    if (!db) {
      throw new Error('데이터베이스 연결에 실패했습니다.')
    }

    const formData = await request.formData()
    const files = formData.getAll('files')
    const orderType = formData.get('orderType')

    console.log('Received request:', {
      orderType,
      fileCount: files.length,
      fileNames: files.map(f => f.name)
    })

    if (!files || files.length === 0) {
      return new NextResponse(
        JSON.stringify({ 
          error: '처리할 파일이 없습니다.' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    if (!orderType) {
      return new NextResponse(
        JSON.stringify({ 
          error: '주문 유형이 지정되지 않았습니다.' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log('Processing files:', files.map(f => f.name))
    console.log('Order type:', orderType)

    const result = await processOrders(files, orderType, db)
    console.log('Process result:', result)

    if (!result) {
      throw new Error('주문 처리 결과가 없습니다.')
    }

    if (result.error) {
      return new NextResponse(
        JSON.stringify({ 
          error: result.error 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const response = {
      message: '주문이 성공적으로 처리되었습니다.',
      data: result.orders || [],
      summary: {
        total: result.total || 0,
        success: result.success || 0,
        error: result.duplicateErrors?.length || 0
      },
      duplicateErrors: result.duplicateErrors || []
    }

    console.log('Sending response:', response)

    return new NextResponse(
      JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {
    console.error('Order processing error:', error)
    
    const errorResponse = {
      error: error.message || '주문 처리 중 오류가 발생했습니다.'
    }

    console.log('Sending error response:', errorResponse)

    return new NextResponse(
      JSON.stringify(errorResponse), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } finally {
    if (db) {
      try {
        closeDB(db)
      } catch (error) {
        console.error('Error closing database connection:', error)
      }
    }
  }
} 