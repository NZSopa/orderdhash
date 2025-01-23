'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'

export default function HumanCheckModal({ isOpen, onClose, orders = [], onConfirm }) {
  const [confirmations, setConfirmations] = useState([])

  // orders가 변경될 때마다 confirmations 초기화
  useEffect(() => {
    if (orders.length > 0) {
      setConfirmations(orders.map(result => ({
        shipping_from: result.shipping_from || '',
        confirmed: false
      })))
    }
  }, [orders])

  const handleConfirm = (index, shipping_from) => {
    setConfirmations(prev => {
      const newConfirmations = [...prev]
      newConfirmations[index] = {
        shipping_from,
        confirmed: true
      }
      return newConfirmations
    })
  }

  const handleSubmit = () => {
    // 모든 주문이 확인되었는지 체크
    const allConfirmed = confirmations.every(conf => conf.confirmed)
    if (!allConfirmed) {
      alert('모든 주문의 출하 위치를 확인해주세요.')
      return
    }

    onConfirm(confirmations)
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  출하 확인
                </Dialog.Title>

                <div className="mt-4">
                  <div className="space-y-4">
                    {orders.map((result, index) => (
                      <div key={result.order.reference_no} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{result.order.reference_no}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {result.order.product_name || result.order.sku}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500">
                            수량: {result.order.quantity}
                          </div>
                        </div>

                        {/* 확인 필요 사항 */}
                        <div className="mt-4">
                          <h3 className="font-medium">확인 필요 사항</h3>
                          <div className="mt-2 space-y-2 text-sm">
                            {result.reason.low_inventory && (
                              <p className="text-yellow-600">
                                ⚠️ 재고 부족 (현재: {result.current_stock}, 필요: {result.required_stock})
                              </p>
                            )}
                            {result.reason.duplicate_consignee && (
                              <p className="text-yellow-600">⚠️ 수취인 중복</p>
                            )}
                            {result.reason.high_price && (
                              <p className="text-yellow-600">⚠️ 고액 주문</p>
                            )}
                          </div>
                        </div>

                        {/* 출하 위치 선택 */}
                        <div className="mt-4">
                          <h3 className="font-medium mb-2">출하 위치 선택</h3>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirm(index, 'nz_bis')}
                              className={`px-4 py-2 rounded-lg border ${
                                confirmations[index]?.shipping_from === 'nz_bis' && confirmations[index]?.confirmed
                                  ? 'bg-blue-500 text-white'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              NZ BIS
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirm(index, 'aus_kn')}
                              className={`px-4 py-2 rounded-lg border ${
                                confirmations[index]?.shipping_from === 'aus_kn' && confirmations[index]?.confirmed
                                  ? 'bg-blue-500 text-white'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              AUS KN
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    onClick={onClose}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
                    onClick={handleSubmit}
                  >
                    확인
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 