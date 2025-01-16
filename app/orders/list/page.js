'use client'

import OrderList from '@/app/components/orders/OrderList'

export default function OrderListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">주문 목록</h1>
        <p className="mt-2 text-sm text-gray-700">
          처리된 모든 주문을 확인하고 검색할 수 있습니다.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <OrderList />
        </div>
      </div>
    </div>
  )
} 