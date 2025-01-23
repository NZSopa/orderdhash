'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'
import FileUpload from '../components/shipment/FileUpload'
import ExcelDownload from '../components/shipment/ExcelDownload'

export default function ShipmentPage() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const limit = 20

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/shipment?page=${page}&limit=${limit}&search=${search}&status=${status}`
      )
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setShipments(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching shipments:', error)
      toast.error('출하 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

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
              onClick={() => handleStatusFilter('')}
              className={`px-4 py-2 rounded-lg border ${
                status === '' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleStatusFilter('processing')}
              className={`px-4 py-2 rounded-lg border ${
                status === 'processing' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'
              }`}
            >
              처리중
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
          <FileUpload onUploadComplete={fetchShipments} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                출하번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품코드
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수취인
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                출하지
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{shipment.shipment_no}</td>
                <td className="px-6 py-4 whitespace-nowrap">{shipment.order_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{shipment.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap">{shipment.consignee_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {shipment.shipment_location === 'aus' ? 'AUS' : 'NZ'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{shipment.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    shipment.status === 'shipped'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {shipment.status === 'shipped' ? '출하완료' : '처리중'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && shipments.length === 0 && (
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