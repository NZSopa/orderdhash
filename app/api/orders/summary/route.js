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

    // 선택한 날짜의 모든 주문 가져오기
    const orders = db.prepare(`
      SELECT * FROM orders 
      WHERE DATE(created_at) = DATE(?)
    `).all(date)

    // 고액 주문 (16,600원 초과)
    const highValueOrders = orders.filter(
      order => order.quantity * order.unit_value > 16600
    )

    // 중복 주문번호
    const referenceNos = new Set()
    const duplicateRefs = new Set()
    const duplicateRefOrders = new Map() // 중복 주문번호별 주문 목록

    orders.forEach(order => {
      if (referenceNos.has(order.reference_no)) {
        duplicateRefs.add(order.reference_no)
        if (!duplicateRefOrders.has(order.reference_no)) {
          // 첫 번째 주문도 포함하기 위해 이전 주문을 찾아서 추가
          const firstOrder = orders.find(o => o.reference_no === order.reference_no)
          duplicateRefOrders.set(order.reference_no, [firstOrder])
        }
        duplicateRefOrders.get(order.reference_no).push(order)
      } else {
        referenceNos.add(order.reference_no)
      }
    })

    // 중복 수취인
    const consigneeCount = {}
    const duplicateConsigneeOrders = new Map() // 중복 수취인별 주문 목록

    orders.forEach(order => {
      if (!consigneeCount[order.consignee_name]) {
        consigneeCount[order.consignee_name] = 1
        duplicateConsigneeOrders.set(order.consignee_name, [order])
      } else {
        consigneeCount[order.consignee_name]++
        duplicateConsigneeOrders.get(order.consignee_name).push(order)
      }
    })

    const duplicateConsignees = Object.entries(consigneeCount)
      .filter(([_, count]) => count > 1)
      .map(([name, count]) => ({
        name,
        count,
        orders: duplicateConsigneeOrders.get(name)
      }))

    return NextResponse.json({
      success: true,
      data: {
        total: orders.length,
        highValue: {
          count: highValueOrders.length,
          orders: highValueOrders
        },
        duplicateRefs: {
          count: duplicateRefs.size,
          refs: Array.from(duplicateRefs),
          orders: Array.from(duplicateRefOrders.values()).flat()
        },
        duplicateConsignees: {
          count: duplicateConsignees.length,
          consignees: duplicateConsignees,
          orders: duplicateConsignees.flatMap(c => c.orders)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching order summary:', error)
    return NextResponse.json(
      { error: '주문 요약을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 