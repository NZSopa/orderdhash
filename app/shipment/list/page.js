'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'
import SplitShipmentModal from '@/app/components/SplitShipmentModal'
import MergeShipmentModal from '@/app/components/MergeShipmentModal'
import { 
  updateOrderLocation, 
  processSplitShipment,
  processMergeShipment,
  validateMergeSelection,
  cancelMergeShipment
} from '@/app/lib/orderUtils'

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
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [splitQuantities, setSplitQuantities] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit')) || 20
  const location = searchParams.get('location') || 'all'

  // 출하 목록 조회
  const fetchShipments = useCallback(async () => {
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
  }, [page, search, limit, location])

  useEffect(() => {
    fetchShipments()
  }, [fetchShipments])

  // 페이지당 표시 수 변경
  const handleLimitChange = (newLimit) => {
    router.push(`/shipment/list?page=1&limit=${newLimit}&search=${search}&location=${location}`)
  }

  // 출하 위치 변경
  const handleLocationChange = async (shipmentId, newLocation) => {
    try {
      const shipment = shipments.find(s => s.id === shipmentId)
      if (!shipment) return

      // 합배송된 주문인 경우 그룹 정보 포함
      const group = shipment.shipment_batch 
        ? shipments.filter(s => s.shipment_batch === shipment.shipment_batch)
        : null

      await updateOrderLocation({
        id: shipmentId,
        reference_no: shipment.reference_no,
        newLocation,
        group,
        onSuccess: (message) => {
          toast.success(message)
          setEditingLocation(null)
          fetchShipments()
        },
        onError: (error) => {
          toast.error(error)
        }
      })
    } catch (error) {
      console.error('Error in handleLocationChange:', error)
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
      // 합배송된 주문인 경우 모든 주문에 대해 처리
      if (shipment.shipment_batch && editingField === 'shipment_no') {
        const batchOrders = shipments.filter(s => s.shipment_batch === shipment.shipment_batch)
        const shipmentIds = batchOrders.map(s => s.id)
        
        const response = await fetch('/api/shipment', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shipmentIds,
            shipment_no: editValue
          })
        })

        const result = await response.json()
        if (result.error) throw new Error(result.error)

        toast.success('수정이 완료되었습니다.')
      } else {
        // 단일 주문 처리
        const response = await fetch('/api/shipment', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: shipment.id,
            field: editingField,
            value: editValue
          })
        })

        const result = await response.json()
        if (result.error) throw new Error(result.error)

        toast.success('수정이 완료되었습니다.')
      }

      fetchShipments()
      handleCancelEdit()
    } catch (error) {
      console.error('Error updating shipment:', error)
      toast.error(error.message || '수정 중 오류가 발생했습니다.')
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

  // 출하번호 일괄 생성
  const handleGenerateShipmentNumbers = async () => {
    try {
      // 선택된 주문들을 배치 그룹별로 정리
      const batchGroups = new Map()
      const nonBatchedShipments = []

      selectedShipments.forEach(shipmentId => {
        const shipment = shipments.find(s => s.id === shipmentId)
        if (!shipment) return

        if (shipment.shipment_batch) {
          if (!batchGroups.has(shipment.shipment_batch)) {
            batchGroups.set(shipment.shipment_batch, [])
          }
          batchGroups.get(shipment.shipment_batch).push(shipment)
        } else {
          nonBatchedShipments.push(shipment)
        }
      })

      // 각 배치 그룹별로 하나의 출하번호 생성 및 적용
      for (const [batchId, batchShipments] of batchGroups) {
        const shipmentIds = batchShipments.map(s => s.id)
        // 그룹의 첫 번째 주문으로 출하번호 생성
        const response = await fetch('/api/shipment/generate-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shipmentIds: [batchShipments[0].id], // 첫 번째 주문의 ID만 전달
            location: batchShipments[0].shipment_location
          })
        })
        
        const data = await response.json()
        if (data.error) throw new Error(data.error)

        // 생성된 하나의 출하번호를 그룹의 모든 주문에 적용
        await fetch('/api/shipment', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shipmentIds, // 모든 주문 ID
            shipment_no: data.results[0].shipmentNo // 첫 번째 주문의 출하번호 사용
          })
        })
      }

      // 비배치 주문들은 개별 출하번호 생성
      for (const shipment of nonBatchedShipments) {
        const response = await fetch('/api/shipment/generate-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shipmentIds: [shipment.id],
            location: shipment.shipment_location
          })
        })
        
        const data = await response.json()
        if (data.error) throw new Error(data.error)

        await fetch('/api/shipment', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: shipment.id,
            shipment_no: data.results[0].shipmentNo
          })
        })
      }

      toast.success('출하번호가 생성되었습니다.')
      setSelectedShipments([])
      fetchShipments()
    } catch (error) {
      console.error('Error generating shipment numbers:', error)
      toast.error(error.message || '출하번호 생성 중 오류가 발생했습니다.')
    }
  }

  // 출하 취소
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
          orderIds: selectedShipments
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

  // 출하 목록 다운로드
  const handleDownloadShipment = async () => {
    try {
      if (location === 'all') {
        toast.error('출하 위치를 먼저 선택해주세요.')
        return
      }

      const response = await fetch(`/api/shipment/download?date=${new Date().toISOString().split('T')[0]}&location=${location}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      // Blob으로 변환하여 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipments_${location}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('출하 목록이 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading shipment data:', error)
      toast.error(error.message)
    }
  }

  const handleDownloadTrackingNumber = async () => {
    try {
      if (location === 'all') {
        toast.error('출하 위치를 먼저 선택해주세요.')
        return
      }

      const response = await fetch(`/api/shipment/download-tracking-number?date=${new Date().toISOString().split('T')[0]}&location=${location}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      // Blob으로 변환하여 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipments_${location}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('출하 목록이 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading shipment data:', error)
      toast.error(error.message)
    }
  }


  // 출하 목록 업로드
  const handleUploadShipment = async (event) => {
    try {
      const file = event.target.files[0]
      if (!file) return
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/shipment/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '업로드 중 오류가 발생했습니다.')
      }
      
      toast.success(result.message)
      fetchShipments() // 목록 새로고침
    } catch (error) {
      console.error('Error uploading shipment data:', error)
      toast.error(error.message)
    }
    
    // 파일 입력 초기화
    event.target.value = ''
  }

  const handleDownloadSSS = async () => {
    try {
      if (location === 'all') {
        toast.error('출하 위치를 먼저 선택해주세요.')
        return
      }

      if (location !== 'nz_bis') {
        toast.error('SSS 다운로드는 NZ BIS 출하만 가능합니다.')
        return
      }

      // 선택된 출하건 중 출하번호가 없는 경우 체크
      const hasNoShipmentNo = shipments.some(shipment => !shipment.shipment_no)
      if (hasNoShipmentNo) {
        toast.error('출하번호를 먼저 입력하세요.')
        return
      }

      const response = await fetch(`/api/shipment/download-sss?location=${location}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SSS_${location}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('SSS 파일이 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading SSS data:', error)
      toast.error(error.message)
    }
  }

  const handleDownloadKSE = async () => {
    try {
      if (location === 'all') {
        toast.error('출하 위치를 선택해주세요.')
        return
      }

      if (location !== 'aus_kn') {
        toast.error('KSE 다운로드는 AUS KN 출하만 가능합니다.')
        return
      }

      // 선택된 출하건 중 출하번호가 없는 경우 체크
      const hasNoShipmentNo = shipments.some(shipment => !shipment.shipment_no)
      if (hasNoShipmentNo) {
        toast.error('출하번호를 먼저 입력하세요.')
        return
      }

      const response = await fetch(`/api/shipment/download-kse?location=${location}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KSE_${location}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('KSE 파일이 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading KSE data:', error)
      toast.error(error.message)
    }
  }

  // 분할 배송 처리
  const handleSplitShipment = async (quantities) => {
    try {
      setIsProcessing(true)
      await processSplitShipment({
        orders: shipments,
        selectedOrders: selectedShipments,
        quantities,
        onSuccess: (message) => {
          toast.success(message)
          setShowSplitModal(false)
          setSplitQuantities({})
          setSelectedShipments([])
          fetchShipments()
        },
        onError: (error) => {
          toast.error(error)
        }
      })
    } catch (error) {
      console.error('Error in handleSplitShipment:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 합배송 처리
  const handleMergeShipment = async () => {
    if (!validateMergeSelection(shipments, selectedShipments)) {
      toast.error('이미 합배송된 주문이 포함되어 있습니다. 기존 합배송을 취소한 후 다시 시도해주세요.')
      return
    }

    try {
      setIsProcessing(true)
      await processMergeShipment({
        orders: shipments,
        selectedOrders: selectedShipments,
        onSuccess: (message) => {
          toast.success(message)
          setShowMergeModal(false)
          setSelectedShipments([])
          fetchShipments()
        },
        onError: (error) => {
          toast.error(error)
        }
      })
    } catch (error) {
      console.error('Error in handleMergeShipment:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 합배송 취소 처리
  const handleCancelMerge = async (orders) => {
    try {
      setIsProcessing(true)
      // 선택된 주문의 배치 ID로 같은 배치의 모든 주문 찾기
      const batchId = orders[0].shipment_batch
      const allBatchOrders = shipments.filter(s => s.shipment_batch === batchId)

      await cancelMergeShipment({
        orders: allBatchOrders,
        onSuccess: (message) => {
          toast.success(message)
          setSelectedShipments([])
          fetchShipments()
        },
        onError: (error) => {
          toast.error(error)
        }
      })
    } catch (error) {
      console.error('Error in handleCancelMerge:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">출하 목록</h1>
        <div className="flex gap-4 items-center">
        <h2 className="text-lg font-bold">출하 위치</h2>
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
        </div>
        
      </div>
      <div className="flex justify-between items-center mb-6">
       
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
          <button
            onClick={handleDownloadShipment}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            출하목록 다운로드
          </button>
          <button
            onClick={handleDownloadShipment}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            운송장번호 입력목록 다운로드
          </button>          
          {location === 'nz_bis' && (
            <button
              onClick={handleDownloadSSS}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              SSS 다운로드
            </button>
          )}
          {location === 'aus_kn' && (
            <button
              onClick={handleDownloadKSE}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              KSE 다운로드
            </button>
          )}
          <label className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
            출하목록 업로드
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUploadShipment}
              className="hidden"
            />
          </label>
          

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
                  {(shipment.sales_price || 0).toLocaleString()}円
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                  {((shipment.sales_price || 0) * (shipment.quantity || 0)).toLocaleString()}円
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
                        {shipment.status === 'dispatched' ? '출하완료' : '출하준비중'}
                      </span>
                    </div>
                  )}
                  {shipment.shipment_batch && (
                    <div className="mt-2 flex flex-col items-start gap-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        합배송 그룹: {shipment.shipment_batch}
                      </span>
                      <button
                        onClick={() => handleCancelMerge([shipment])}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        합배송 취소
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {shipment.shipment_at ? new Date(shipment.shipment_at).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}
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

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-center">
          {selectedShipments.length > 0 && (
            <>
              <button
                onClick={() => setShowSplitModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                분할 배송
              </button>
              <button
                onClick={() => setShowMergeModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                합배송
              </button>
            </>
          )}
        </div>
      </div>

      <SplitShipmentModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        selectedOrders={selectedShipments}
        orders={shipments}
        onConfirm={handleSplitShipment}
        isProcessing={isProcessing}
      />

      <MergeShipmentModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        selectedOrders={selectedShipments}
        orders={shipments}
        onConfirm={handleMergeShipment}
        isProcessing={isProcessing}
      />
    </div>
  )
} 