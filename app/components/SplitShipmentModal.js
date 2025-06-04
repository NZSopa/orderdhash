import { useState, useEffect } from 'react'

export default function SplitShipmentModal({ 
  isOpen, 
  onClose, 
  selectedOrders, 
  orders, 
  onConfirm, 
  isProcessing 
}) {
  const [quantities, setQuantities] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      // 선택된 주문의 초기 수량 설정
      const initialQuantities = {}
      selectedOrders.forEach(orderId => {
        const order = orders.find(o => o.id === orderId)
        if (order) {
          initialQuantities[orderId] = order.quantity
        }
      })
      setQuantities(initialQuantities)
      setErrors({})
    }
  }, [isOpen, selectedOrders, orders])

  const handleQuantityChange = (orderId, value) => {
    const order = orders.find(o => o.id === orderId)
    const newValue = parseInt(value) || 0
    
    if (newValue > order.quantity) {
      setErrors(prev => ({
        ...prev,
        [orderId]: '분할 수량은 원래 수량을 초과할 수 없습니다.'
      }))
    } else if (newValue <= 0) {
      setErrors(prev => ({
        ...prev,
        [orderId]: '분할 수량은 0보다 커야 합니다.'
      }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[orderId]
        return newErrors
      })
    }

    setQuantities(prev => ({
      ...prev,
      [orderId]: newValue
    }))
  }

  const handleSubmit = () => {
    if (Object.keys(errors).length > 0) return
    onConfirm(quantities)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold mb-4">분할 배송 처리</h2>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {selectedOrders.map(orderId => {
            const order = orders.find(o => o.id === orderId)
            return (
              <div key={orderId} className="border-b pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">주문번호: {order.reference_no}</p>
                    <p className="text-sm text-gray-600">상품: {order.product_name}</p>
                    <p className="text-sm text-gray-600">총 수량: {order.quantity}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <input
                      type="number"
                      value={quantities[orderId] || ''}
                      onChange={(e) => handleQuantityChange(orderId, e.target.value)}
                      className={`w-24 px-2 py-1 border rounded ${
                        errors[orderId] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      min="1"
                      max={order.quantity}
                    />
                    {errors[orderId] && (
                      <p className="text-red-500 text-xs mt-1">{errors[orderId]}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
            onClick={handleSubmit}
            disabled={isProcessing || Object.keys(errors).length > 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isProcessing ? '처리중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
} 