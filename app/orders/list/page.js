'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Pagination from '@/app/components/Pagination'
import SearchBox from '@/app/components/SearchBox'
import HumanCheckModal from '@/app/components/orders/HumanCheckModal'
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
      // 선택된 주문의 전체 데이터 가져오기
      const selectedOrderData = orders.filter(order => 
        selectedOrders.includes(order.reference_no)
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
        if (order.status) continue;

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
  const handleLocationChange = async (reference_no, newLocation) => {
    try {
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
  const getSortedOrders = () => {
    if (!sortField) return orders

    return [...orders].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // null 값 처리
      if (aValue === null) aValue = ''
      if (bValue === null) bValue = ''

      // 숫자 필드 처리
      if (['quantity', 'sales_price', 'current_stock'].includes(sortField)) {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
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
                <div key={index} className="text-sm text-yellow-700">
                  {duplicate.type === 'reference_no' ? '주문번호' : '수취인'} 중복: {duplicate.value} ({duplicate.items.length}건)
                  <div className="ml-4 text-xs text-gray-600">
                    {duplicate.items.map(item => (
                      <div key={item.reference_no}>
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

        <div className="flex justify-end items-center">
          <div className="flex items-center gap-2">
          <button
            onClick={handleShipment}
            disabled={isProcessing || selectedOrders.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isProcessing ? '처리 중...' : '출하 처리'}
          </button>
            <button
              onClick={handleDownloadKana}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Kana 다운로드
            </button>
            <label className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 cursor-pointer">
              Kana 업로드
              <input
                type="file"
                accept=".csv"
                onChange={handleUploadKana}
                className="hidden"
              />
            </label>
          </div>
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
            {getSortedOrders().map((order) => (
              <tr 
                key={order.reference_no} 
                id={`order-${order.reference_no}`}
                className={cn(
                  "hover:bg-gray-50",
                  highlightedOrder === order.reference_no && "bg-yellow-50"
                )}
              >
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
                <td className="px-3 py-4 whitespace-nowrap text-sm">{order.sales_site}</td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {editingOrder === order.reference_no ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        defaultValue={order.shipment_location}
                        onChange={(e) => handleLocationChange(order.reference_no, e.target.value)}
                        onBlur={() => setEditingOrder(null)}
                      >
                        <option value="aus-kn">aus-kn</option>
                        <option value="nz-bis">nz-bis</option>
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
          onPageChange={(page) => router.push(`/orders/list?page=${page}&limit=${limit}&search=${search}&startDate=${startDate}&endDate=${endDate}`)}
        />
      </div>


    </div>
  )
} 