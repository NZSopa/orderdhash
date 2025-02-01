import { NextResponse } from 'next/server'
import { withDB } from '@/app/lib/db'

export async function GET() {
  return await withDB(async (db) => {
    try {
      // 미출하 주문 현황 조회 (status가 NULL이거나 'sh'를 포함하지 않는 주문)
      const pendingOrders = db.prepare(`
        SELECT 
          DATE(substr(created_at, 1, 10)) as date,
          COUNT(*) as count
        FROM orders
        WHERE status IS NULL OR status='ordered'
        GROUP BY DATE(substr(created_at, 1, 10))
        ORDER BY date DESC
        LIMIT 30
      `).all()

      return NextResponse.json({
        success: true,
        data: pendingOrders
      })
    } catch (error) {
      console.error('Error fetching pending orders:', error)
      return NextResponse.json(
        { error: '미출하 주문 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  })
} 