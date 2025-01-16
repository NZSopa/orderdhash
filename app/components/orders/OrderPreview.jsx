'use client'

export default function OrderPreview({ orders }) {
  if (!orders || orders.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">처리된 주문 목록</h3>
        <p className="text-sm text-gray-500">총 {orders.length}건의 주문이 처리되었습니다.</p>
      </div>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">주문번호</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">상품코드</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">상품명</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">수량</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">수취인</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">우편번호</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">주소</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">연락처</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">단가</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orders.map((order, index) => (
                  <tr key={`${order['reference No.']}-${index}`} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">{order['reference No.']}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.sku}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order['product-name']}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order['quantity-purchased']}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      <div>{order['Consignees NAME']}</div>
                      <div className="text-gray-500">{order.Kana}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.ConsigneesPOST}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order['Consignees Address']}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order.ConsigneesPhonenumber}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{order['unit value']?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 