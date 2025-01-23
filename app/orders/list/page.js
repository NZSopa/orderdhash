'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'
import HumanCheckModal from '@/app/components/orders/HumanCheckModal'
import { cn } from '@/app/lib/utils'

export default function OrderListPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [humanCheckOrders, setHumanCheckOrders] = useState(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit')) || 20

  // 주문 목록 조회
  useEffect(() => {
    fetchOrders()
  }, [page, search, limit])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/orders?page=${page}&limit=${limit}&search=${search}`
      )
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setOrders(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('주문 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 페이지당 표시 수 변경
  const handleLimitChange = (newLimit) => {
    router.push(`/orders/list?page=1&limit=${newLimit}&search=${search}`)
  }

  // 체크박스 처리
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(orders.filter(order => order.status !== 'sh').map(order => order.reference_no))
    } else {
      setSelectedOrders([])
    }
  }

  const handleSelect = (reference_no) => {
    const order = orders.find(o => o.reference_no === reference_no)
    if (order.status === 'sh') return

    setSelectedOrders(prev => {
      if (prev.includes(reference_no)) {
        return prev.filter(id => id !== reference_no)
      } else {
        return [...prev, reference_no]
      }
    })
  }

  // 출하 처리
  const handleShipment = async () => {
    if (selectedOrders.length === 0) {
      toast.error('선택된 주문이 없습니다.')
      return
    }

    setIsProcessing(true)
    try {
      const selectedOrderData = orders.filter(order => 
        selectedOrders.includes(order.reference_no)
      )

      const response = await fetch('/api/shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedOrderData)
      })

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Human Check가 필요한 주문이 있는지 확인
      const needsHumanCheck = result.results.some(r => r.needs_human_check)
      
      if (needsHumanCheck) {
        // Human Check 모달 표시
        setHumanCheckOrders(result.results.filter(r => r.needs_human_check))
      } else {
        // 바로 출하 처리
        await handleConfirmShipment(result.results)
      }
    } catch (error) {
      console.error('Error processing shipment:', error)
      toast.error(error.message || '출하 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 출하 확정 처리
  const handleConfirmShipment = async (results) => {
    try {
      // Human Check가 필요한 경우와 아닌 경우를 구분
      const orders = humanCheckOrders 
        ? humanCheckOrders.map(r => r.order)
        : results.map(r => r.order)

      const confirmations = results.map(conf => ({
        shipment_no: generateShipmentNo(),
        shipping_from: conf.shipping_from.startsWith('aus') ? 'aus' : 'nz'
      }))

      const response = await fetch('/api/shipment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders, confirmations })
      })

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      toast.success('출하 처리가 완료되었습니다.')
      setSelectedOrders([])
      fetchOrders()
    } catch (error) {
      console.error('Error confirming shipment:', error)
      toast.error(error.message || '출하 확정 중 오류가 발생했습니다.')
    }
  }

  const handleHumanCheckConfirm = async (confirmations) => {
    try {
      await handleConfirmShipment(confirmations)
      setHumanCheckOrders(null)
    } catch (error) {
      console.error('Error confirming human check:', error)
      toast.error(error.message || '출하 확인 중 오류가 발생했습니다.')
    }
  }

  // 출하 번호 생성
  const generateShipmentNo = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `SH${year}${month}${day}${random}`
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">주문 목록</h1>
        <div className="flex gap-4 items-center">
          <select
            value={limit}
            onChange={(e) => handleLimitChange(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10개씩 보기</option>
            <option value="20">20개씩 보기</option>
            <option value="50">50개씩 보기</option>
            <option value="100">100개씩 보기</option>
          </select>
          <SearchBox 
            defaultValue={search} 
            onSearch={(value) => router.push(`/orders/list?page=1&limit=${limit}&search=${value}`)} 
          />
          <button
            onClick={handleShipment}
            disabled={isProcessing || selectedOrders.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isProcessing ? '처리 중...' : '출하 처리'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[50px] px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === orders.filter(order => order.status !== 'sh').length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="w-[150px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문번호
              </th>
              <th className="w-[120px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품코드
              </th>
              <th className="w-[250px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제품명
              </th>
              <th className="w-[120px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수취인
              </th>
              <th className="w-[120px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량 (세트)
              </th>
              <th className="w-[100px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="w-[100px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.reference_no} className="hover:bg-gray-50">
                <td className="px-3 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.reference_no)}
                    onChange={() => handleSelect(order.reference_no)}
                    disabled={order.status === 'sh'}
                    className={cn(
                      "rounded border-gray-300",
                      order.status === 'sh' && "opacity-50 cursor-not-allowed"
                    )}
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{order.reference_no}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{order.sku}</td>
                <td className="px-3 py-4 whitespace-normal text-sm">{order.product_name}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{order.consignee_name}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {order.quantity} ({order.set_qty || '-'}개/세트)
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{order.unit_value}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    order.status === 'sh' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'sh' ? '출하완료' : '대기중'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          주문 내역이 없습니다.
        </div>
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={(page) => router.push(`/orders/list?page=${page}&limit=${limit}&search=${search}`)}
        />
      </div>

      <HumanCheckModal
        isOpen={!!humanCheckOrders}
        onClose={() => setHumanCheckOrders(null)}
        orders={humanCheckOrders || []}
        onConfirm={handleHumanCheckConfirm}
      />
    </div>
  )
} 