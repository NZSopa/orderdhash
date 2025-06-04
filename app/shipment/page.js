'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'
import FileUpload from '../components/shipment/FileUpload'
import ExcelDownload from '../components/shipment/ExcelDownload'

export default function ShipmentPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'preparing'
  const limit = 20

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/shipment?page=${page}&limit=${limit}&search=${search}&status=${status}`
      )
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setOrders(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('출하 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleStatusFilter = (newStatus) => {
    router.push(`/shipment?status=${newStatus}&search=${search}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">출하 목록</h1>
          <ExcelDownload />
        </div>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusFilter('preparing')}
              className={`px-4 py-2 rounded-lg border ${
                status === 'preparing' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'
              }`}
            >
              배송준비중
            </button>
            <button
              onClick={() => handleStatusFilter('shipped')}
              className={`px-4 py-2 rounded-lg border ${
                status === 'shipped' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'
              }`}
            >
              출하완료
            </button>
          </div>
          <SearchBox 
            defaultValue={search} 
            onSearch={(value) => router.push(`/shipment?status=${status}&search=${value}`)} 
          />
          <FileUpload onUploadComplete={fetchOrders} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품코드
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제품명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수취인
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                출고지
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                출하일시
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{order.reference_no}</td>
                <td className="px-6 py-4 whitespace-nowrap">{order.sku}</td>
                <td className="px-6 py-4 whitespace-normal">{order.product_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{order.consignee_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.shipment_location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{order.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    order.status === 'shipped'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'shipped' ? '출하완료' : '배송준비중'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.shipment_at ? new Date(order.shipment_at).toLocaleString('ko-KR') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          출하 내역이 없습니다.
        </div>
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={(page) => router.push(`/shipment?page=${page}&status=${status}&search=${search}`)}
        />
      </div>
    </div>
  )
} 