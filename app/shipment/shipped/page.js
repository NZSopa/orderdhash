'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'

export default function CompletedShipmentListPage() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selectedShipments, setSelectedShipments] = useState([])
  const [sortField, setSortField] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc')
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 20
  const location = searchParams.get('location') || 'all'
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  // 출하 완료 목록 조회
  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/shipment/shipped?page=${page}&limit=${limit}&location=${location}&startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setShipments(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching completed shipments:', error)
      toast.error('발송송 완료 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, limit, location, startDate, endDate])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  // 출하 완료 취소 처리
  const handleCancelshipped = async () => {
    if (!selectedShipments.length) {
      toast.error('발송송 출하를 선택해주세요.')
      return
    }

    if (!confirm('선택한 주문의 발송 완료 상태를 취소하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch('/api/shipment/cancel-shipped', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentIds: selectedShipments
        })
      })

      const result = await response.json()
      
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('발송송 완료가 취소되었습니다.')
      setSelectedShipments([])
      fetchShipments()
    } catch (error) {
      console.error('Error canceling shipped shipments:', error)
      toast.error('발송 완료 취소 중 오류가 발생했습니다.')
    }
  }

  // 전체 선택 처리
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedShipments(shipments.map(s => s.id))
    } else {
      setSelectedShipments([])
    }
  }

  // 개별 선택 처리
  const handleSelect = (id) => {
    setSelectedShipments(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  // 정렬 처리
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // 정렬된 데이터 반환
  const getSortedShipments = () => {
    if (!sortField) return shipments

    return [...shipments].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (aValue === null) aValue = ''
      if (bValue === null) bValue = ''

      if (['quantity', 'unit_value'].includes(sortField)) {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }

      if (sortField === 'shipment_at') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span className="text-gray-400 ml-1">↕</span>
    }
    return sortOrder === 'asc' ? 
      <span className="text-blue-600 ml-1">↑</span> : 
      <span className="text-blue-600 ml-1">↓</span>
  }

  // 날짜 변경 처리
  const handleDateChange = (type, value) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(type, value)
    params.set('page', '1')
    router.push(`/shipment/shipped?${params.toString()}`)
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">발송 완료 목록</h1>
        <div className="flex gap-4 items-center">
          <select
            value={location}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString())
              params.set('location', e.target.value)
              params.set('page', '1')
              router.push(`/shipment/shipped?${params.toString()}`)
            }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="aus_kn">AUS KN</option>
            <option value="nz_bis">NZ BIS</option>
          </select>
          <select
            value={limit}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString())
              params.set('limit', e.target.value)
              params.set('page', '1')
              router.push(`/shipment/shipped?${params.toString()}`)
            }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10개씩 보기</option>
            <option value="20">20개씩 보기</option>
            <option value="50">50개씩 보기</option>
            <option value="100">100개씩 보기</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedShipments.length > 0 && (
            <button
              onClick={handleCancelshipped}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              발송 완료 취소
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[50px] px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedShipments.length === shipments.length && shipments.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('shipment_location')}
              >
                출하위치 {renderSortIcon('shipment_location')}
              </th>
              <th 
                className="w-[150px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('shipment_no')}
              >
                출하번호 {renderSortIcon('shipment_no')}
              </th>
              
              <th 
                className="w-[150px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('reference_no')}
              >
                주문번호 {renderSortIcon('reference_no')}
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('product_code')}
              >
                상품코드 {renderSortIcon('product_code')}
              </th>
              <th 
                className="w-[250px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('product_name')}
              >
                상품명 {renderSortIcon('product_name')}
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('quantity')}
              >
                주문수량 {renderSortIcon('quantity')}
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('weight')}
              >
                무게  {renderSortIcon('weight')}
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sales_price')}
              >
                판매단가 {renderSortIcon('sales_price')}
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                판매 총 금액 
              </th>
              <th 
                className="w-[150px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('shipment_at')}
              >
                출하일시 {renderSortIcon('shipment_at')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedShipments().map((shipment) => (
              <tr key={shipment.id} className="hover:bg-gray-50">
                <td className="px-3 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedShipments.includes(shipment.id)}
                    onChange={() => handleSelect(shipment.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{shipment.shipment_location}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{shipment.shipment_no}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{shipment.reference_no}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{shipment.product_code}</td>
                <td className="px-3 py-4 text-sm">
                  <div className="whitespace-pre-line break-words">{shipment.product_name} {shipment.set_qty > 1? `${shipment.set_qty} SETS` : ''}</div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {(shipment.quantity || 0).toLocaleString()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {shipment.weight}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {(shipment.sales_price || 0).toLocaleString()}円
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {((shipment.sales_price * shipment.quantity || 0) * (shipment.quantity || 0)).toLocaleString()}円
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {shipment.shipment_at ? new Date(shipment.shipment_at).toLocaleString() : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && shipments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          발송 완료 내역이 없습니다.
        </div>
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={(page) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('page', page.toString())
            router.push(`/shipment/completed?${params.toString()}`)
          }}
        />
      </div>
    </div>
  )
} 