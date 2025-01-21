'use client'

import OrderList from '../../components/orders/OrderList'

export default function OrderListPage() {
  return (
    <div className="flex justify-center min-h-screen bg-gray-50">
      <div className="w-[90%] py-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <OrderList />
          </div>
        </div>
      </div>
    </div>
  )
} 