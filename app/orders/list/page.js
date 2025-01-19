'use client'

import OrderList from '../../components/orders/OrderList'

export default function OrderListPage() {
  return (
    <div className="space-y-6">


      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <OrderList />
        </div>
      </div>
    </div>
  )
} 