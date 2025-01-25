'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'

export default function ShipmentListPage() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [selectedShipments, setSelectedShipments] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [sortField, setSortField] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc')
  const [editingLocation, setEditingLocation] = useState(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit')) || 20
  const location = searchParams.get('location') || 'all'

  // 출하 목록 조회
  useEffect(() => {
    fetchShipments()
  }, [page, search, limit, location])

  const fetchShipments = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/shipment?page=${page}&limit=${limit}&search=${search}&location=${location}`
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
  }

  // 페이지당 표시 수 변경
  const handleLimitChange = (newLimit) => {
    router.push(`/shipment/list?page=1&limit=${newLimit}&search=${search}&location=${location}`)
  }

  // 출하 위치 변경
  const handleLocationChange = async (shipmentId, newLocation) => {
    try {
      const response = await fetch(`/api/shipment/${shipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field: 'shipment_location',
          value: newLocation
        })
      })

      const result = await response.json()
      
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('출하 위치가 수정되었습니다.')
      setEditingLocation(null)
      fetchShipments()
    } catch (error) {
      console.error('Error updating location:', error)
      toast.error('출하 위치 수정 중 오류가 발생했습니다.')
    }
  }

  // 편집 시작
  const handleStartEdit = async (shipment, field) => {
    if (field === 'shipment_no') {
      try {
        const response = await fetch('/api/shipment/generate-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: shipment.shipment_location
          })
        })
        
        const data = await response.json()
        
        if (data.error) {
          toast.error(data.error)
          return
        }
        
        setEditingId(shipment.id)
        setEditingField(field)
        setEditValue(data.shipmentNo)
      } catch (error) {
        console.error('Error generating shipment number:', error)
        toast.error('출하번호 생성 중 오류가 발생했습니다.')
      }
    } else {
      setEditingId(shipment.id)
      setEditingField(field)
      setEditValue(field === 'status' ? shipment.status : shipment.shipment_no)
    }
  }

  // 편집 취소
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingField(null)
    setEditValue('')
  }

  // 편집 저장
  const handleSaveEdit = async (shipment) => {
    try {
      const response = await fetch(`/api/shipment/${shipment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field: editingField,
          value: editValue
        })
      })

      const result = await response.json()
      
      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('수정이 완료되었습니다.')
      fetchShipments()
      handleCancelEdit()
    } catch (error) {
      console.error('Error updating shipment:', error)
      toast.error('수정 중 오류가 발생했습니다.')
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

  // 출하 취소 처리
  const handleCancelShipments = async () => {
    if (!selectedShipments.length) {
      toast.error('취소할 출하를 선택해주세요.')
      return
    }

    if (!confirm('선택한 출하를 취소하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch('/api/shipment/cancel', {
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

      toast.success('출하가 취소되었습니다.')
      setSelectedShipments([])
      fetchShipments()
    } catch (error) {
      console.error('Error canceling shipments:', error)
      toast.error('출하 취소 중 오류가 발생했습니다.')
    }
  }

  // 출하번호 일괄 생성
  const handleGenerateShipmentNumbers = async () => {
    if (!selectedShipments.length) {
      toast.error('출하번호를 생성할 출하를 선택해주세요.')
      return
    }

    if (location === 'all') {
      toast.error('출하 위치를 먼저 선택해주세요.')
      return
    }

    try {
      const response = await fetch('/api/shipment/generate-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shipmentIds: selectedShipments,
          location: location
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        toast.error(data.error)
        return
      }

      toast.success('출하번호가 생성되었습니다.')
      setSelectedShipments([])
      fetchShipments()
    } catch (error) {
      console.error('Error generating shipment numbers:', error)
      toast.error('출하번호 생성 중 오류가 발생했습니다.')
    }
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

      // null 값 처리
      if (aValue === null) aValue = ''
      if (bValue === null) bValue = ''

      // 숫자 필드 처리
      if (['quantity', 'unit_value'].includes(sortField)) {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }

      // 날짜 필드 처리
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

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">출하 목록</h1>
        <div className="flex gap-4 items-center">
          {selectedShipments.length > 0 && (
            <>
              <button
                onClick={handleGenerateShipmentNumbers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                출하번호 생성
              </button>
              <button
                onClick={handleCancelShipments}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                출하 취소
              </button>
            </>
          )}
          <select
            value={location}
            onChange={(e) => router.push(`/shipment/list?page=1&limit=${limit}&search=${search}&location=${e.target.value}`)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="aus_kn">AUS KN</option>
            <option value="nz_bis">NZ BIS</option>
          </select>
          <select
            value={limit}
            onChange={(e) => router.push(`/shipment/list?page=1&limit=${e.target.value}&search=${search}&location=${location}`)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10개씩 보기</option>
            <option value="20">20개씩 보기</option>
            <option value="50">50개씩 보기</option>
            <option value="100">100개씩 보기</option>
          </select>
          <SearchBox 
            defaultValue={search} 
            onSearch={(value) => router.push(`/shipment/list?page=1&limit=${limit}&search=${value}&location=${location}`)} 
          />
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
                className="w-[100px] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('quantity')}
              >
                주문수량 {renderSortIcon('quantity')}
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('unit_value')}
              >
                단가 {renderSortIcon('unit_value')}
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                총 금액
              </th>
              <th 
                className="w-[120px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                상태 {renderSortIcon('status')}
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
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {editingLocation === shipment.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        defaultValue={shipment.shipment_location}
                        onChange={(e) => handleLocationChange(shipment.id, e.target.value)}
                        onBlur={() => setEditingLocation(null)}
                      >
                        <option value="aus_kn">AUS KN</option>
                        <option value="nz_bis">NZ BIS</option>
                      </select>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingLocation(shipment.id)}
                      className="hover:text-blue-600"
                    >
                      {shipment.shipment_location}
                    </button>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {editingId === shipment.id && editingField === 'shipment_no' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="px-2 py-1 border rounded-lg w-32"
                      />
                      <button
                        onClick={() => handleSaveEdit(shipment)}
                        className="text-green-600 hover:text-green-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-red-600 hover:text-red-700"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => handleStartEdit(shipment, 'shipment_no')}
                    >
                      {shipment.shipment_no}
                    </div>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{shipment.reference_no}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">{shipment.product_code}</td>
                <td className="px-3 py-4 text-sm">
                  <div className="whitespace-pre-line break-words">{shipment.product_name}</div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {(shipment.quantity || 0).toLocaleString()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {(shipment.unit_value || 0).toLocaleString()}円
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {((shipment.unit_value || 0) * (shipment.quantity || 0)).toLocaleString()}円
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {editingId === shipment.id && editingField === 'status' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="px-2 py-1 border rounded-lg"
                      >
                        <option value="processing">출하준비중</option>
                        <option value="shipped">출하완료</option>
                      </select>
                      <button
                        onClick={() => handleSaveEdit(shipment)}
                        className="text-green-600 hover:text-green-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-red-600 hover:text-red-700"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => handleStartEdit(shipment, 'status')}
                    >
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        shipment.status === 'shipped' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {shipment.status === 'shipped' ? '출하완료' : '출하준비중'}
                      </span>
                    </div>
                  )}
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
          출하 내역이 없습니다.
        </div>
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          onPageChange={(page) => router.push(`/shipment/list?page=${page}&limit=${limit}&search=${search}&location=${location}`)}
        />
      </div>
    </div>
  )
} 