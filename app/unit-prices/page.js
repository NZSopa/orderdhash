'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { FaFileUpload, FaSearch, FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown, FaExclamationTriangle, FaPlus, FaFileExcel, FaDownload, FaCloudDownloadAlt } from 'react-icons/fa'
import * as XLSX from 'xlsx'

const EXCEL_TEMPLATE = [
  {
    '제품 코드': '',
    '년월': 'YYYY-MM',
    '단가': '',
    '메모': ''
  }
]

export default function UnitPricesPage() {
  const [prices, setPrices] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [sortField, setSortField] = useState('year_month')
  const [sortOrder, setSortOrder] = useState('desc')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPrice, setEditingPrice] = useState(null)
  const [formData, setFormData] = useState({
    product_code: '',
    year_month: '',
    price: 0,
    memo: ''
  })
  const [isUploading, setIsUploading] = useState(false)
  const [sheetData, setSheetData] = useState([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState(null)
  const [sheetSaveStatus, setSheetSaveStatus] = useState('')
  const [sheetSaveStats, setSheetSaveStats] = useState(null)

  const loadPrices = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortField,
        sortOrder,
        ...(searchQuery && { search: searchQuery })
      })

      const response = await fetch(`/api/unit-prices?${queryParams}`)
      const data = await response.json()
      
      if (response.ok) {
        setPrices(data.data || [])
        setTotalItems(data.total || 0)
        setCurrentPage(data.currentPage || 1)
      } else {
        console.error('Error loading prices:', data.error)
      }
    } catch (error) {
      console.error('Error loading prices:', error)
    }
  }, [searchQuery, currentPage, itemsPerPage, sortField, sortOrder])

  useEffect(() => {
    loadPrices()
  }, [loadPrices])

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 년월 형식 검증 (YYYY-MM 또는 YYYY/MM 형식 허용)
    const yearMonthPattern = /^(\d{4})[-/](0?[1-9]|1[0-2])$/
    const match = formData.year_month.match(yearMonthPattern)
    
    if (!match) {
      alert('년월은 YYYY-MM 또는 YYYY/MM 형식으로 입력해주세요. (예: 2024-01, 2024/10)')
      return
    }

    const year = parseInt(match[1])
    const month = parseInt(match[2])

    // 월을 2자리 형식으로 변환 (예: 1 -> 01, 10 -> 10)
    const formattedYearMonth = `${year}-${month.toString().padStart(2, '0')}`

    try {
      // 수정 모드일 때는 기존 데이터를 먼저 삭제
      if (editingPrice) {
        const deleteResponse = await fetch(
          `/api/unit-prices?product_code=${encodeURIComponent(editingPrice.product_code)}&year_month=${encodeURIComponent(editingPrice.year_month)}`,
          { method: 'DELETE' }
        )
        if (!deleteResponse.ok) {
          throw new Error('기존 데이터 삭제 중 오류가 발생했습니다.')
        }
      }

      const response = await fetch('/api/unit-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price: {
            ...formData,
            year_month: formattedYearMonth
          }
        })
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setIsModalOpen(false)
        setEditingPrice(null)
        resetFormData()
        await loadPrices()
      } else {
        alert(data.error || '원가 데이터 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving price:', error)
      alert('원가 데이터 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (price) => {
    setEditingPrice(price)
    setFormData({
      product_code: price.product_code,
      year_month: price.year_month,
      price: price.price,
      memo: price.memo || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (price) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(
        `/api/unit-prices?product_code=${encodeURIComponent(price.product_code)}&year_month=${encodeURIComponent(price.year_month)}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('원가 데이터가 삭제되었습니다.')
        await loadPrices()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting price:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 파일 형식 검사
    const fileExt = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(fileExt)) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          if (jsonData.length === 0) {
            alert('파일에 데이터가 없습니다.')
            setIsUploading(false)
            return
          }

          // 데이터 형식 검증 및 변환
          const prices = jsonData.map(row => {
            // 년월 형식 검증 및 변환
            let yearMonth = row['년월']?.toString() || ''
            const yearMonthPattern = /^(\d{4})[-/](0?[1-9]|1[0-2])$/
            const match = yearMonth.match(yearMonthPattern)
            
            if (match) {
              const year = match[1]
              const month = parseInt(match[2]).toString().padStart(2, '0')
              yearMonth = `${year}-${month}`
            }

            return {
              product_code: row['제품 코드']?.toString().trim(),
              year_month: yearMonth,
              price: parseFloat(row['단가']) || 0,
              memo: row['메모']?.toString() || ''
            }
          }).filter(price => 
            price.product_code && 
            price.year_month && 
            !isNaN(price.price) &&
            /^\d{4}-\d{2}$/.test(price.year_month)
          )

          if (prices.length === 0) {
            alert('유효한 데이터가 없습니다. 파일 형식을 확인해주세요.\n\n필수 항목:\n- 제품 코드\n- 년월 (YYYY-MM 또는 YYYY/MM)\n- 단가')
            setIsUploading(false)
            return
          }

          console.log('변환된 데이터:', prices) // 디버깅을 위한 로그

          // 서버에 데이터 전송
          const response = await fetch('/api/unit-prices/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prices })
          })

          const result = await response.json()
          if (result.success) {
            alert(`${prices.length}개의 원가 데이터가 업로드되었습니다.`)
            await loadPrices()
          } else {
            let errorMessage = result.error || '업로드 중 오류가 발생했습니다.'
            if (result.missingProducts) {
              errorMessage += '\n\n누락된 제품 코드:\n' + 
                result.missingProducts.map(item => 
                  `- ${item.product_code} (${item.year_month})`
                ).join('\n')
            }
            throw new Error(errorMessage)
          }
        } catch (error) {
          console.error('Error processing file:', error)
          alert(error.message || '파일 처리 중 오류가 발생했습니다.')
        }
        setIsUploading(false)
        e.target.value = '' // 파일 입력 초기화
      }

      reader.onerror = () => {
        alert('파일 읽기 중 오류가 발생했습니다.')
        setIsUploading(false)
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
      setIsUploading(false)
    }
  }

  const resetFormData = () => {
    setFormData({
      product_code: '',
      year_month: '',
      price: 0,
      memo: ''
    })
  }

  const handleDeleteAll = async () => {
    if (!confirm('모든 원가 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return

    try {
      const response = await fetch('/api/unit-prices?deleteAll=true', {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert(`${data.deletedCount}개의 원가 데이터가 삭제되었습니다.`)
        await loadPrices()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting all prices:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="ml-1" />
    return sortOrder === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
  }

  const renderSortableHeader = (field, label) => (
    <th
      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        {getSortIcon(field)}
      </div>
    </th>
  )

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handleTemplateDownload = () => {
    try {
      // 워크북 생성
      const wb = XLSX.utils.book_new()
      
      // 워크시트 생성
      const ws = XLSX.utils.json_to_sheet(EXCEL_TEMPLATE)
      
      // 열 너비 설정
      const colWidths = [
        { wch: 15 }, // 제품 코드
        { wch: 10 }, // 년월
        { wch: 12 }, // 단가
        { wch: 30 }, // 메모
      ]
      ws['!cols'] = colWidths

      // 워크북에 워크시트 추가
      XLSX.utils.book_append_sheet(wb, ws, '단가 템플릿')
      
      // 파일 다운로드
      XLSX.writeFile(wb, '단가_템플릿.xlsx')
    } catch (error) {
      console.error('템플릿 다운로드 중 오류 발생:', error)
      alert('템플릿 다운로드 중 오류가 발생했습니다.')
    }
  }

  const handleFetchSheet = async () => {
    setSheetLoading(true)
    setSheetError(null)
    try {
      const res = await fetch('/api/unit-prices/sheet')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '불러오기 실패')
      setSheetData(json.data)
    } catch (err) {
      setSheetError(err.message)
      setSheetData([])
    } finally {
      setSheetLoading(false)
    }
  }

  const handleSaveSheetToDB = async () => {
    setSheetSaveStatus('저장 중...')
    setSheetSaveStats(null)
    try {
      const res = await fetch('/api/unit-prices/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: sheetData }),
      })
      const result = await res.json()
      if (result.success) {
        setSheetSaveStatus('저장 완료!')
        setSheetSaveStats({
          total: result.total,
          successCount: result.successCount,
          failCount: result.failCount,
        })
        setSheetData([])
        await loadPrices()
      } else {
        setSheetSaveStatus(result.error || '저장 실패')
      }
    } catch (e) {
      setSheetSaveStatus('저장 중 오류 발생')
    }
  }

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm">
        {/* 헤더 섹션 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">원가 관리</h1>
              <p className="mt-1 text-sm text-gray-500">
                제품별 월별 원가를 관리할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="제품 코드로 검색..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 pr-4 py-2 border rounded-lg w-96 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
             
             
            </div>
          </div>
        </div>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
 
            <div className="flex items-center gap-3">

              <button
                onClick={handleTemplateDownload}
                className="btn bg-indigo-500 hover:bg-indigo-600 text-white gap-2"
              >
                <FaDownload /> 엑셀 양식
              </button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="btn bg-green-500 hover:bg-green-600 text-white gap-2 cursor-pointer"
              >
                <FaFileExcel /> 엑셀 업로드
              </label>
              <button
                className="btn bg-yellow-500 hover:bg-yellow-600 text-white gap-2"
                onClick={handleFetchSheet}
                disabled={sheetLoading}
              >
                {sheetLoading ? '불러오는 중...' : (<><FaCloudDownloadAlt className="w-4 h-4" /> 구글 시트에서 불러오기</>)}
              </button>
              <button
                className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
                onClick={() => {
                  setEditingPrice(null)
                  resetFormData()
                  setIsModalOpen(true)
                }}
              >
                <FaPlus className="w-4 h-4" />
                원가 추가
              </button>
              <button
                className="btn bg-red-500 hover:bg-red-600 text-white gap-2"
                onClick={handleDeleteAll}
              >
                <FaExclamationTriangle className="w-4 h-4" />
                전체 삭제
              </button>
            </div>
          </div>
        </div>

        {/* 테이블 컨트롤 */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
          <select
            className="select select-bordered select-sm w-40"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
          >
            <option value="15">15개씩 보기</option>
            <option value="30">30개씩 보기</option>
            <option value="50">50개씩 보기</option>
            <option value="100">100개씩 보기</option>
          </select>
          <span className="text-sm text-gray-600">
            총 <span className="font-medium">{totalItems}</span>개 중{' '}
            <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>-
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span>개
          </span>
        </div>

        {/* 구글 시트 미리보기 및 저장 결과 */}
        {(sheetData.length > 0 || sheetSaveStatus || sheetSaveStats) && (
          <div className="px-6 pt-4">
            {sheetData.length > 0 && (
              <>
                <div className="mb-2 text-sm text-gray-700">구글 시트에서 불러온 데이터 미리보기</div>
                <div className="flex gap-3 mb-2">
                  <button
                    className="btn bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    onClick={handleSaveSheetToDB}
                    disabled={!!sheetSaveStatus && sheetSaveStatus.includes('저장 중')}
                  >
                    {sheetSaveStatus && sheetSaveStatus.includes('저장 중') ? '저장 중...' : 'DB에 저장'}
                  </button>
                </div>
                <div className="overflow-x-auto border rounded mt-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(sheetData[0]).map((header) => (
                          <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sheetData.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {/* 저장 결과 메시지 및 통계 */}
            {sheetSaveStatus && (
              <div className={`mt-2 flex items-center text-sm ${sheetSaveStatus.includes('완료') ? 'text-green-700' : 'text-red-700'}`}>{sheetSaveStatus}</div>
            )}
            {sheetSaveStats && (
              <div className="bg-gray-50 border rounded p-3 text-sm flex gap-6 mt-2">
                <div>총 처리: <span className="font-bold">{sheetSaveStats.total}</span></div>
                <div>성공: <span className="font-bold text-green-600">{sheetSaveStats.successCount}</span></div>
                <div>실패: <span className="font-bold text-red-600">{sheetSaveStats.failCount}</span></div>
              </div>
            )}
            {sheetSaveStats && sheetSaveStats.errors && (
              <details className="mt-2 text-xs text-red-500">
                <summary>실패 상세 보기</summary>
                <pre>{JSON.stringify(sheetSaveStats.errors, null, 2)}</pre>
              </details>
            )}
          </div>
        )}

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                {renderSortableHeader('product_code', '제품 코드')}
                {renderSortableHeader('product_name', '제품명')}
                {renderSortableHeader('year_month', '년월')}
                {renderSortableHeader('price', '가격')}
                {renderSortableHeader('memo', '메모')}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prices.map((price, index) => (
                <tr 
                  key={`${price.product_code}-${price.year_month}-${index}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {price.product_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.product_name || '제품명 없음'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.year_month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {price.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {price.memo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(price)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="수정"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(price)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="삭제"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <span className="text-sm text-gray-700">
              <span className="font-medium">{currentPage}</span> / {totalPages} 페이지
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPrice ? '원가 수정' : '원가 추가'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingPrice(null)
                  resetFormData()
                }}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제품 코드
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.product_code}
                    onChange={(e) =>
                      setFormData({ ...formData, product_code: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    년월 (YYYY-MM 또는 YYYY/MM)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.year_month}
                    onChange={(e) =>
                      setFormData({ ...formData, year_month: e.target.value })
                    }
                    placeholder="예: 2024-01 또는 2024/10"
                    pattern="\\d{4}[-/]\\d{1,2}"
                    title="YYYY-MM 또는 YYYY/MM 형식으로 입력해주세요."
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    형식: YYYY-MM 또는 YYYY/MM (예: 2024-01)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    가격
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    메모
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.memo}
                    onChange={(e) =>
                      setFormData({ ...formData, memo: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingPrice(null)
                    resetFormData()
                  }}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {editingPrice ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}