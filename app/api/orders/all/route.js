import { NextResponse } from 'next/server'
import { getDB } from '@/app/lib/db'

export async function GET(request) {
  const db = getDB()
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { error: '날짜가 필요합니다.' },
        { status: 400 }
      )
    }

    // 선택한 날짜의 모든 주문 가져오기 (페이지네이션 없음)
    const orders = db.prepare(`
      SELECT * FROM orders 
      WHERE DATE(created_at) = DATE(?)
      ORDER BY created_at DESC
    `).all(date)

    return NextResponse.json({
      success: true,
      data: orders
    })

  } catch (error) {
    console.error('Error fetching all orders:', error)
    return NextResponse.json(
      { error: '주문 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 