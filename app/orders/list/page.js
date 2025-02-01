'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'
import { cn } from '@/app/lib/utils'
import { FaExclamationTriangle } from 'react-icons/fa'

export default function OrderListPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [warnings, setWarnings] = useState({
    duplicates: [],
    customsRisk: []
  })
  const [highlightedOrder, setHighlightedOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [editingKana, setEditingKana] = useState(null)
  const [pendingOrders, setPendingOrders] = useState([])
  const [sortField, setSortField] = useState(null)
  const [sortOrder, setSortOrder] = useState('asc')
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [splitQuantities, setSplitQuantities] = useState({})
  const [currentBatchId, setCurrentBatchId] = useState(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const page = parseInt(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit')) || 20
  const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/orders?page=${page}&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${endDate}&status=pending`
      )
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      console.log('Fetched orders:', data.data) // 디버깅용 로그
      
      setOrders(data.data)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('주문 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, search, limit, startDate, endDate])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // 미출하 주문 현황 조회
  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('/api/orders/pending')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setPendingOrders(data.data)
    } catch (error) {
      console.error('Error fetching pending orders:', error)
      toast.error('미출하 주문 현황을 불러오는 중 오류가 발생했습니다.')
    }
  }

  // 초기 데이터 로딩
  useEffect(() => {
    fetchPendingOrders()
  }, [])

  // 페이지당 표시 수 변경
  const handleLimitChange = (newLimit) => {
    router.push(`/orders/list?page=1&limit=${newLimit}&search=${search}&startDate=${startDate}&endDate=${endDate}`)
  }

  // 날짜 범위 변경 처리
  const handleDateChange = (type, newDate) => {
    if (type === 'start') {
      router.push(`/orders/list?page=1&limit=${limit}&search=${search}&startDate=${newDate}&endDate=${endDate}`)
    } else {
      router.push(`/orders/list?page=1&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${newDate}`)
    }
  }

  // 오늘 날짜 주문 조회
  const handleTodayOrders = () => {
    const today = new Date().toISOString().split('T')[0]
    router.push(`/orders/list?page=1&limit=${limit}&search=${search}&startDate=${today}&endDate=${today}`)
  }

  // 체크박스 처리
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(orders.filter(
        order => order.status === 'ordered'
      ).map(order => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleSelect = (id) => {
    const order = orders.find(o => o.id === id)
    if (order.status !== 'ordered') return

    setSelectedOrders(prev => {
      if (prev.includes(id)) {
        return prev.filter(orderId => orderId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  // 분할 배송 처리
  const handleSplitShipment = async (quantities) => {
    try {
      setIsProcessing(true)
      const batchId = new Date().getTime().toString()

      const selectedOrderData = orders
        .filter(order => selectedOrders.includes(order.id))
        .map(order => {
          const originalBatch = order.shipment_batch // 기존 배치 ID 저장
          return {
            ...order,
            quantity: quantities[order.id] || order.quantity,
            shipment_batch: batchId,
            original_batch: originalBatch, // 기존 배치 ID 전달
            remaining_quantity: order.quantity - (quantities[order.id] || order.quantity)
          }
        })

      const response = await fetch('/api/shipment/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedOrderData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('분할 배송 처리가 완료되었습니다.')
      setShowSplitModal(false)
      setSplitQuantities({})
      setSelectedOrders([])
      await fetchOrders()
    } catch (error) {
      console.error('Error processing split shipment:', error)
      toast.error(error.message || '분할 배송 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 합배송 처리 전 유효성 검사
  const validateMergeSelection = (selectedOrderIds) => {
    const selectedOrders = selectedOrderIds.map(id => orders.find(o => o.id === id))
    const hasBatchedOrder = selectedOrders.some(order => order.shipment_batch !== null)
    
    if (hasBatchedOrder) {
      toast.error('이미 합배송된 주문이 포함되어 있습니다. 기존 합배송을 취소한 후 다시 시도해주세요.')
      return false
    }
    
    return true
  }

  // 합배송 처리
  const handleMergeShipment = async () => {
    if (!validateMergeSelection(selectedOrders)) {
      return
    }

    try {
      setIsProcessing(true)
      const batchId = new Date().getTime().toString()

      const selectedOrderData = orders
        .filter(order => selectedOrders.includes(order.id))
        .map(order => ({
          ...order,
          shipment_batch: batchId
        }))

      const response = await fetch('/api/shipment/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedOrderData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('합배송 처리가 완료되었습니다.')
      setShowMergeModal(false)
      setSelectedOrders([])
      await fetchOrders()
    } catch (error) {
      console.error('Error processing merge shipment:', error)
      toast.error(error.message || '합배송 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 출하 처리
  const handleShipment = async () => {
    if (selectedOrders.length === 0) {
      toast.error('선택된 주문이 없습니다.')
      return
    }

    setIsProcessing(true)
    try {
      // 선택된 주문의 전체 데이터 가져오기
      const selectedOrderData = orders.filter(order => 
        selectedOrders.includes(order.id)
      ).map(order => ({
        ...order,
        set_qty: parseInt(order.set_qty) || 1,  // set_qty가 없으면 기본값 1
        weight: order.weight || null  // weight가 없으면 null
      }))

      console.log('Selected orders:', selectedOrderData) // 디버깅용 로그

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

      toast.success('출하 처리가 완료되었습니다.')
      setSelectedOrders([])
      await fetchOrders()
      await fetchPendingOrders()
    } catch (error) {
      console.error('Error processing shipment:', error)
      toast.error(error.message || '출하 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 경고 사항 체크
  const checkWarnings = async (orders) => {
    try {
      // 중복 체크를 위한 맵
      const referenceGroups = new Map()
      const consigneeGroups = new Map()
      const duplicates = []

      // 관세 위험 체크를 위한 맵
      const customsRisk = []

      // 1차: 데이터 수집
      for (const order of orders) {
        // status가 NULL이거나 비어있는 주문만 처리
        if (order.status !== 'ordered') continue;

        // 중복 체크 - 주문번호
        if (!referenceGroups.has(order.reference_no)) {
          referenceGroups.set(order.reference_no, [])
        }
        referenceGroups.get(order.reference_no).push(order)

        // 중복 체크 - 수취인
        if (!consigneeGroups.has(order.consignee_name)) {
          consigneeGroups.set(order.consignee_name, [])
        }
        consigneeGroups.get(order.consignee_name).push(order)

        // 제품 정보 조회
        const response = await fetch(`/api/settings/product-codes?sku=${order.sku}`)
        const productInfo = await response.json()
        
        if (productInfo.data && productInfo.data.length > 0) {
          const product = productInfo.data[0]
          
          // 관세 위험 체크
          const totalValue = order.quantity * product.sales_price
          if (totalValue > 16500) {
            customsRisk.push({
              ...order,
              product_name: product.product_name,
              sales_price: product.sales_price,
              totalValue
            })
          }
        }
      }

      // 2차: 중복 그룹 처리
      for (const [reference_no, items] of referenceGroups) {
        if (items.length > 1) {
          duplicates.push({
            type: 'reference_no',
            value: reference_no,
            items: items
          })
        }
      }

      for (const [consignee_name, items] of consigneeGroups) {
        if (items.length > 1) {
          duplicates.push({
            type: 'consignee',
            value: consignee_name,
            items: items
          })
        }
      }

      setWarnings({
        duplicates,
        customsRisk
      })
    } catch (error) {
      console.error('Error checking warnings:', error)
      toast.error('주문 확인 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    if (orders.length > 0) {
      checkWarnings(orders)
    }
  }, [orders])

  // 주문번호 클릭 핸들러
  const handleOrderClick = (reference_no) => {
    setHighlightedOrder(reference_no)
    // 해당 주문이 있는 곳으로 스크롤
    const element = document.getElementById(`order-${reference_no}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // 출고지 수정 처리
  const handleLocationChange = async (reference_no, newLocation, group) => {
    try {
      // 합배송된 주문인 경우
      if (group && group.length > 1) {
        const promises = group.map(order => 
          fetch('/api/orders', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reference_no: order.reference_no,
              shipment_location: newLocation
            })
          })
        )

        await Promise.all(promises)
        toast.success('합배송 주문의 출고지가 모두 수정되었습니다.')
      } else {
        // 단일 주문인 경우
        const response = await fetch('/api/orders', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reference_no,
            shipment_location: newLocation
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error)
        }

        toast.success('출고지가 수정되었습니다.')
      }

      setEditingOrder(null)
      fetchOrders()
    } catch (error) {
      console.error('Error updating location:', error)
      toast.error(error.message || '출고지 수정 중 오류가 발생했습니다.')
    }
  }

  // 미출하 주문 필터링
  const handlePendingOrderClick = (date) => {
    router.push(`/orders/list?page=1&limit=${limit}&search=&startDate=${date}&endDate=${date}&status=pending`)
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
  const getSortedOrders = useCallback(() => {
    if (!sortField) return orders

    return [...orders].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // null 값 처리
      if (aValue === null) aValue = ''
      if (bValue === null) bValue = ''

      // 숫자 필드 특별 처리
      if (['quantity', 'sales_price', 'current_stock'].includes(sortField)) {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [orders, sortField, sortOrder])

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field) => {
    if (sortField !== field) return null
    return (
      <span className="ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  const handleDownloadKana = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`/api/orders/download?date=${today}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      // Blob으로 변환하여 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders_${today}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('주문 데이터가 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading kana data:', error)
      toast.error(error.message)
    }
  }

  const handleUploadKana = async (event) => {
    try {
      const file = event.target.files[0]
      if (!file) return
      
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/orders/upload-kana', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '업로드 중 오류가 발생했습니다.')
      }
      
      toast.success(result.message)
      fetchOrders() // 목록 새로고침
    } catch (error) {
      console.error('Error uploading kana data:', error)
      toast.error(error.message)
    }
    
    // 파일 입력 초기화
    event.target.value = ''
  }

  // kana 수정 처리 함수 추가
  const handleKanaChange = async (reference_no, newKana) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_no,
          kana: newKana,
          shipment_location: orders.find(order => order.reference_no === reference_no)?.shipment_location
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('kana가 수정되었습니다.')
      setEditingKana(null)
      fetchOrders()
    } catch (error) {
      console.error('Error updating kana:', error)
      toast.error(error.message || 'kana 수정 중 오류가 발생했습니다.')
    }
  }

  // 분할 배송 모달
  const SplitShipmentModal = () => {
    if (!showSplitModal) return null

    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))
    const hasBatchedOrders = selectedOrdersData.some(order => order.shipment_batch)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <h2 className="text-xl font-bold mb-4">
            {hasBatchedOrders ? '합배송 분할 처리' : '분할 배송 처리'}
          </h2>
          <div className="space-y-4">
            {selectedOrdersData.map(order => (
              <div key={order.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{order.reference_no}</p>
                  <p className="text-sm text-gray-600">{order.product_name}</p>
                  {order.shipment_batch && (
                    <p className="text-xs text-blue-600">합배송 그룹: {order.shipment_batch}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={order.quantity}
                    value={splitQuantities[order.id] || order.quantity}
                    onChange={(e) => setSplitQuantities(prev => ({
                      ...prev,
                      [order.id]: parseInt(e.target.value)
                    }))}
                    className="w-20 px-2 py-1 border rounded"
                  />
                  <span className="text-sm text-gray-600">/ {order.quantity}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setShowSplitModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              취소
            </button>
            <button
              onClick={() => handleSplitShipment(splitQuantities)}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isProcessing ? '처리 중...' : '분할 배송 처리'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 주문 데이터를 배치별로 그룹화하는 함수 수정
  const getGroupedOrders = useCallback(() => {
    const sortedOrders = getSortedOrders()
    const groupedOrders = []
    const batchGroups = new Map()

    // 배치별로 주문 그룹화
    sortedOrders.forEach(order => {
      if (order.shipment_batch) {
        const batchId = order.shipment_batch
        if (!batchGroups.has(batchId)) {
          batchGroups.set(batchId, [])
        }
        batchGroups.get(batchId).push(order)
      } else {
        groupedOrders.push([order])
      }
    })

    // 그룹화된 배치 주문 추가 (2개 이상인 경우만)
    batchGroups.forEach((orders, batchId) => {
      if (orders.length > 1) {
        // 동일한 배치 내에서 created_at으로 정렬
        const sortedBatchOrders = orders.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        )
        groupedOrders.push(sortedBatchOrders)
      } else {
        // 단일 주문은 개별 처리
        groupedOrders.push([orders[0]])
      }
    })

    return groupedOrders
  }, [getSortedOrders])

  // 합배송 취소 처리
  const handleCancelMerge = async (orders) => {
    try {
      setIsProcessing(true)
      const response = await fetch('/api/shipment/merge/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orders)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('합배송이 취소되었습니다.')
      setSelectedOrders([])
      await fetchOrders()
    } catch (error) {
      console.error('Error canceling merge shipment:', error)
      toast.error(error.message || '합배송 취소 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  // 테이블 행 렌더링 함수 수정
  const renderOrderRow = (order, isFirstInGroup, isLastInGroup, totalInGroup, group) => {
    const isBatched = order.shipment_batch !== null && totalInGroup > 1
    const mergeInfo = isBatched ? group.map(o => ({
      reference_no: o.reference_no,
      consignee_name: o.consignee_name,
      product_name: o.product_name,
      quantity: o.quantity
    })) : null

    return (
      <tr 
        key={`${order.id}-${order.reference_no}`} 
        id={`order-${order.reference_no}`}
        className={cn(
          "hover:bg-gray-50 transition-colors duration-150",
          highlightedOrder === order.reference_no && "bg-yellow-50",
          isBatched && [
            "relative border-blue-400",
            isFirstInGroup && "border-t-2",
            !isFirstInGroup && "border-t",
            isLastInGroup && "border-b-2",
            !isLastInGroup && "border-b",
            "border-l-2 border-r-2"
          ]
        )}
      >
        <td className="px-3 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedOrders.includes(order.id)}
            onChange={() => handleSelect(order.id)}
            disabled={order.status !== 'ordered'}
            className={cn(
              "rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
              order.status !== 'ordered' && "opacity-50 cursor-not-allowed"
            )}
          />
        </td>
        <td className="px-3 py-4 whitespace-nowrap">
          {isBatched && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  합배송 ({totalInGroup}건)
                </span>
                {isFirstInGroup && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelMerge(group)
                    }}
                    className="text-xs text-red-600 hover:text-red-800 ml-1"
                  >
                    취소
                  </button>
                )}
              </div>
              {isFirstInGroup && (
                <div className="text-xs text-gray-500 ml-1">
                  {mergeInfo.map((info, idx) => (
                    <div key={info.reference_no} className={cn(
                      "flex justify-between",
                      idx !== 0 && "mt-1 pt-1 border-t border-gray-200"
                    )}>
                      <span className="font-medium">{info.reference_no}</span>
                      <span>{info.consignee_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className={cn(
            "text-sm",
            isBatched && "font-medium text-blue-900 mt-2"
          )}>
            {order.sales_site}
          </div>
        </td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">
          {editingOrder === order.reference_no ? (
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1 text-sm"
                defaultValue={order.shipment_location}
                onChange={(e) => handleLocationChange(order.reference_no, e.target.value, group)}
                onBlur={() => setEditingOrder(null)}
              >
                <option value="aus_kn">aus-kn</option>
                <option value="nz_bis">nz-bis</option>
              </select>
            </div>
          ) : (
            <button
              onClick={() => setEditingOrder(order.reference_no)}
              className="hover:text-blue-600"
            >
              {order.shipment_location}
            </button>
          )}
        </td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">
          <span className={order.current_stock < order.quantity ? 'text-red-600 font-medium' : ''}>
            {order.current_stock || 0}
          </span>
        </td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">{order.reference_no}</td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">{order.sku}</td>
        <td className="px-3 py-4 whitespace-normal text-sm">{order.original_product_name}</td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">{order.consignee_name}</td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">
          {editingKana === order.reference_no ? (
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm w-full"
              defaultValue={order.kana || ''}
              onBlur={(e) => handleKanaChange(order.reference_no, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleKanaChange(order.reference_no, e.target.value)
                } else if (e.key === 'Escape') {
                  setEditingKana(null)
                }
              }}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingKana(order.reference_no)}
              className="hover:text-blue-600 text-left w-full"
            >
              {order.kana || ''}
            </button>
          )}
        </td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">{order.quantity}</td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">{order.sales_price}</td>
        <td className="px-3 py-4 whitespace-nowrap text-sm">
          <span className={`px-2 py-1 text-xs rounded-full ${
            order.status !== 'ordered' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {order.status === 'shipped' ? '출하완료' : 
            order.status === 'ordered' ? '주문접수' : 
            order.status === 'preparing' ? '배송준비중' : 
            order.status === 'dispatched' ? '출하완료' : 
            order.status === 'delivered' ? '배송완료' : 
            order.status === 'canceled' ? '주문취소' : '대기중'}
          </span>
        </td>
      </tr>
    )
  }

  // 합배송 모달 컴포넌트 수정
  const MergeShipmentModal = () => {
    if (!showMergeModal) return null

    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id))

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-gray-900">합배송 처리</h2>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {selectedOrdersData.map(order => (
              <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{order.reference_no}</p>
                    <p className="text-sm text-gray-600 mt-1">{order.product_name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      수취인: {order.consignee_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      수량: {order.quantity}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      출고지: {order.shipment_location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowMergeModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleMergeShipment}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? '처리 중...' : '합배송 처리'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-none px-4">
      {/* 경고 섹션 */}
      <div className="mb-8 space-y-4">
        {/* 중복 주문 경고 */}
        {warnings.duplicates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800 flex items-center gap-2">
              <FaExclamationTriangle className="text-yellow-600" />
              중복 주문 확인 필요 ({warnings.duplicates.length}건)
            </h3>
            <div className="mt-2 space-y-2">
              {warnings.duplicates.map((duplicate, index) => (
                <div key={`${duplicate.type}-${index}`} className="text-sm text-yellow-700">
                  {duplicate.type === 'reference_no' ? '주문번호' : '수취인'} 중복: {duplicate.value} ({duplicate.items.length}건)
                  <div className="ml-4 text-xs text-gray-600">
                    {duplicate.items.map(item => (
                      <div key={`${item.id}-${item.reference_no}`}>
                        <button
                          onClick={() => handleOrderClick(item.reference_no)}
                          className="text-blue-600 hover:underline"
                        >
                          {item.reference_no}
                        </button>
                        {' - '}{item.consignee_name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 관세 위험 경고 */}
        {warnings.customsRisk.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-800 flex items-center gap-2">
              <FaExclamationTriangle className="text-red-600" />
              관세 발생 위험 ({warnings.customsRisk.length}건)
            </h3>
            <div className="mt-2 space-y-2">
              {warnings.customsRisk.map((risk, index) => (
                <div key={index} className="text-sm text-red-700">
                  주문번호: {' '}
                  <button
                    onClick={() => handleOrderClick(risk.reference_no)}
                    className="text-blue-600 hover:underline"
                  >
                    {risk.reference_no}
                  </button>
                  {' - ￥'}{risk.totalValue.toLocaleString()}
                  <div className="ml-4 text-xs text-gray-600">
                    {risk.product_name} (단가: ￥{risk.sales_price.toLocaleString()} × {risk.quantity}개)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 미출하 주문 현황 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">미출하 주문 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pendingOrders.map((item) => (
            <div
              key={item.date}
              onClick={() => handlePendingOrderClick(item.date)}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="text-sm text-gray-600">{item.date}</div>
              <div className="mt-2 flex justify-between items-center">
                <span className="text-lg font-semibold text-blue-600">
                  {item.count}건
                </span>
                <span className="text-sm text-gray-500">미출하</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">주문 목록</h1>
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
              onSearch={(value) => router.push(`/orders/list?page=1&limit=${limit}&search=${value}&startDate=${startDate}&endDate=${endDate}`)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTodayOrders}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              TODAY
            </button>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              min="2024-01-01"
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span>~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end items-center gap-2">
          <button
            onClick={() => setShowSplitModal(true)}
            disabled={selectedOrders.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            분할 배송
          </button>
          <button
            onClick={() => setShowMergeModal(true)}
            disabled={selectedOrders.length < 2}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            합배송
          </button>
          <button
            onClick={handleShipment}
            disabled={isProcessing || selectedOrders.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
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
              <th 
                className="w-[80px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sales_site')}
              >
                플랫폼 {renderSortIcon('sales_site')}
              </th>
              <th 
                className="w-[80px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('shipment_location')}
              >
                출고지 {renderSortIcon('shipment_location')}
              </th>
              <th 
                className="w-[70px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('current_stock')}
              >
                재고 {renderSortIcon('current_stock')}
              </th>
              <th 
                className="w-[150px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('reference_no')}
              >
                주문번호 {renderSortIcon('reference_no')}
              </th>
              <th 
                className="w-[100px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sku')}
              >
                상품코드 {renderSortIcon('sku')}
              </th>
              <th 
                className="w-[300px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('original_product_name')}
              >
                제품명 {renderSortIcon('original_product_name')}
              </th>
              <th 
                className="w-[100px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('consignee_name')}
              >
                수취인 {renderSortIcon('consignee_name')}
              </th>
              <th 
                className="w-[100px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('kana')}
              >
                Kana {renderSortIcon('kana')}
              </th>
              <th 
                className="w-[60px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('quantity')}
              >
                수량 {renderSortIcon('quantity')}
              </th>
              <th 
                className="w-[60px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sales_price')}
              >
                금액 {renderSortIcon('sales_price')}
              </th>
              <th 
                className="w-[60px] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                상태 {renderSortIcon('status')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getGroupedOrders().map((group, groupIndex) => (
              <React.Fragment key={`group-${groupIndex}-${group[0]?.shipment_batch || 'single'}`}>
                {group.map((order, orderIndex) => 
                  renderOrderRow(
                    order,
                    orderIndex === 0,
                    orderIndex === group.length - 1,
                    group.length,
                    group
                  )
                )}
              </React.Fragment>
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
          onPageChange={(page) => router.push(`/orders/list?page=${page}&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${endDate}`)}
        />
      </div>

      {/* 분할 배송 모달 */}
      <SplitShipmentModal />

      {/* 합배송 모달 */}
      <MergeShipmentModal />

    </div>
  )
} 