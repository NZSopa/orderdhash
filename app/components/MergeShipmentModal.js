import { useEffect } from 'react'

export default function MergeShipmentModal({
  isOpen,
  onClose,
  selectedOrders,
  orders,
  onConfirm,
  isProcessing
}) {
  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 초기화 작업
    }
  }, [isOpen])

  if (!isOpen) return null

  const selectedOrderDetails = selectedOrders
    .map(orderId => orders.find(o => o.id === orderId))
    .filter(Boolean)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold mb-4">합배송 처리</h2>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {selectedOrderDetails.map(order => (
            <div key={order.id} className="border-b pb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">주문번호: {order.reference_no}</p>
                  <p className="text-sm text-gray-600">상품: {order.product_name}</p>
                  <p className="text-sm text-gray-600">수량: {order.quantity}</p>
                  <p className="text-sm text-gray-600">
                    출고지: {order.shipment_location === 'aus_kn' ? 'AUS KN' : 'NZ BIS'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ 선택한 {selectedOrderDetails.length}개의 주문을 합배송 처리하시겠습니까?
          </p>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isProcessing}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isProcessing ? '처리중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
} 