'use client'

import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFileExcel, FaChevronLeft, FaChevronRight, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'
import * as XLSX from 'xlsx'

export default function CodesPage() {
  const [codes, setCodes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [editingSite, setEditingSite] = useState(null)
  const [salesSites, setSalesSites] = useState([])
  const [equation, setEquation] = useState('')
  const [answer, setAnswer] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [sortField, setSortField] = useState('sales_code')
  const [sortOrder, setSortOrder] = useState('asc')
  const [formData, setFormData] = useState({
    sales_code: '',
    product_name: '',
    set_qty: 1,
    product_code: '',
    sales_price: 0,
    weight: 0,
    sales_site: '',
    site_url: ''
  })
  const [siteFormData, setSiteFormData] = useState({
    code: '',
    name: ''
  })

  useEffect(() => {
    const init = async () => {
      try {
        // 마이그레이션 실행
        const migrationResponse = await fetch('/api/migrations', { method: 'POST' })
        const migrationData = await migrationResponse.json()
        if (!migrationResponse.ok) {
          console.error('Error running migrations:', migrationData.error)
        }
      } catch (error) {
        console.error('Error running migrations:', error)
      }

      // 데이터 로드
      await loadCodes()
      await loadSalesSites()
    }

    init()
  }, [])

  const loadCodes = async () => {
    try {
      const response = await fetch(
        searchQuery ? 
        `/api/codes?query=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=${itemsPerPage}&sortField=${sortField}&sortOrder=${sortOrder}` : 
        `/api/codes?page=${currentPage}&limit=${itemsPerPage}&sortField=${sortField}&sortOrder=${sortOrder}`
      )
      const data = await response.json()
      if (data.error) {
        console.error('Error loading codes:', data.error)
        return
      }
      setCodes(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(Math.ceil(data.total / itemsPerPage))
    } catch (error) {
      console.error('Error loading codes:', error)
    }
  }

  useEffect(() => {
    loadCodes()
  }, [currentPage, searchQuery, sortField, sortOrder, itemsPerPage])

  const loadSalesSites = async () => {
    try {
      const response = await fetch('/api/sites')
      const data = await response.json()
      if (data.error) {
        console.error('Error loading sales sites:', data.error)
        return
      }
      setSalesSites(data.data || [])
    } catch (error) {
      console.error('Error loading sales sites:', error)
    }
  }

  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)
    setCurrentPage(1) // 검색 시 첫 페이지로 이동
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: formData })
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        setIsModalOpen(false)
        setEditingCode(null)
        resetFormData()
        await loadCodes()
      } else {
        alert(data.error || '코드 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving code:', error)
      alert('코드 저장 중 오류가 발생했습니다.')
    }
  }

  const handleSiteSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteFormData)
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        setIsSiteModalOpen(false)
        setEditingSite(null)
        resetSiteFormData()
        await loadSalesSites()
      } else {
        alert(data.error || '판매 사이트 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving sales site:', error)
      alert('판매 사이트 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (code) => {
    setEditingCode(code)
    setFormData({
      id: code.id || '',
      sales_code: code.sales_code || '',
      product_name: code.product_name || '',
      set_qty: code.set_qty || 1,
      product_code: code.product_code || '',
      sales_price: code.sales_price || 0,
      weight: code.weight || 0,
      sales_site: code.sales_site || '',
      site_url: code.site_url || ''
    })
    setIsModalOpen(true)
  }

  const handleEditSite = (site) => {
    setEditingSite(site)
    setSiteFormData({
      id: site.id || '',
      code: site.code || '',
      name: site.name || ''
    })
    setIsSiteModalOpen(true)
  }

  const handleDelete = async (salesCode) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/codes?sales_code=${encodeURIComponent(salesCode)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('코드가 삭제되었습니다.')
        await loadCodes()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting code:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteSite = async (code) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/sites?code=${encodeURIComponent(code)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('판매 사이트가 삭제되었습니다.')
        await loadSalesSites()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting sales site:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      alert('파일을 선택해주세요.')
      return
    }

    // 파일 확장자 체크
    const fileExtension = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(fileExtension)) {
      alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    try {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const fileData = new Uint8Array(e.target.result)
          const workbook = XLSX.read(fileData, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet)

          const uniqueData = new Map()
          
          json.forEach(row => {
            const formattedRow = {
              sales_code: String(row.sales_code || ''),
              product_name: String(row.product_name || ''),
              set_qty: Number(row.set_qty || 1),
              product_code: String(row.product_code || ''),
              sales_price: Number(row.sales_price || 0),
              weight: Number(row.weight || 0),
              sales_site: String(row.sales_site || ''),
              site_url: String(row.site_url || '')
            }
            uniqueData.set(formattedRow.sales_code, formattedRow)
          })

          const formattedData = Array.from(uniqueData.values())

          if (formattedData.length === 0) {
            alert('처리할 데이터가 없습니다.')
            return
          }

          const response = await fetch('/api/codes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codes: formattedData })
          })
          
          const responseData = await response.json()
          if (response.ok && responseData.success) {
            alert('엑셀 파일이 성공적으로 처리되었습니다.')
            await loadCodes()
          } else {
            alert(responseData.error || '코드 저장 중 오류가 발생했습니다.')
          }
        } catch (error) {
          console.error('Error processing excel file:', error)
          alert('엑셀 파일 처리 중 오류가 발생했습니다.')
        }
      }

      reader.onerror = () => {
        alert('파일 읽기 중 오류가 발생했습니다.')
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('Error handling file upload:', error)
      alert('파일 업로드 중 오류가 발생했습니다.')
    }
  }

  const resetFormData = () => {
    setFormData({
      id: '',
      sales_code: '',
      product_name: '',
      set_qty: 1,
      product_code: '',
      sales_price: 0,
      weight: 0,
      sales_site: '',
      site_url: ''
    })
  }

  const resetSiteFormData = () => {
    setSiteFormData({
      id: '',
      code: '',
      name: ''
    })
  }

  const handleDeleteAll = async () => {
    try {
      const num1 = Math.floor(Math.random() * 10) + 1
      const num2 = Math.floor(Math.random() * 10) + 1
      const operator = ['+', '-', '*'][Math.floor(Math.random() * 3)]
      let result

      switch (operator) {
        case '+':
          result = num1 + num2
          break
        case '-':
          result = num1 - num2
          break
        case '*':
          result = num1 * num2
          break
      }

      setEquation(`${num1} ${operator} ${num2}`)
      setAnswer(result.toString())
      setIsDeleteModalOpen(true)
    } catch (error) {
      console.error('Error generating equation:', error)
      alert('수식 생성 중 오류가 발생했습니다.')
    }
  }

  const handleVerifyAndDelete = async () => {
    if (!userAnswer) return

    try {
      if (answer !== userAnswer) {
        alert('수식이 올바르지 않습니다. 다시 시도해주세요.')
        return
      }

      const response = await fetch(
        `/api/codes?action=deleteAll&answer=${encodeURIComponent(answer)}&userAnswer=${encodeURIComponent(userAnswer)}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('모든 코드가 성공적으로 삭제되었습니다.')
        setIsDeleteModalOpen(false)
        setUserAnswer('')
        await loadCodes()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting all codes:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
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
    if (sortField !== field) return <FaSort className="w-4 h-4 ml-1" />
    return sortOrder === 'asc' ? 
      <FaSortUp className="w-4 h-4 ml-1 text-blue-600" /> : 
      <FaSortDown className="w-4 h-4 ml-1 text-blue-600" />
  }

  const renderSortableHeader = (field, label) => (
    <th 
      scope="col" 
      className={`px-3 py-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 ${
        field === 'sales_code' ? 'w-[120px]' :
        field === 'product_name' ? 'w-[200px]' :
        field === 'set_qty' ? 'w-[80px]' :
        field === 'product_code' ? 'w-[120px]' :
        field === 'sales_price' ? 'w-[100px]' :
        field === 'weight' ? 'w-[100px]' :
        field === 'sales_site' ? 'w-[100px]' :
        field === 'site_url' ? 'w-[150px]' :
        'w-[80px]'
      }`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        {getSortIcon(field)}
      </div>
    </th>
  )

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">코드 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            상품 코드와 판매 정보를 효율적으로 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="판매코드, 상품명, 상품코드, 판매사이트로 검색..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-80 pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 hover:bg-white"
            />
            <FaSearch className="absolute left-4 top-4 text-gray-400" />
          </div>
          <label className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm">
            <FaFileExcel className="mr-2" />
            파일 업로드
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </label>
          <button
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            onClick={() => {
              setEditingCode(null)
              resetFormData()
              setIsModalOpen(true)
            }}
          >
            <FaPlus className="mr-2" />
            추가
          </button>
          <button
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-sm"
            onClick={handleDeleteAll}
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="space-y-6">
            {/* 페이지 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-50 px-6 py-3 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-700">
                    전체{' '}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {total}
                    </span>
                    {' '}건 중{' '}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>
                    {' '}-{' '}
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {Math.min(currentPage * itemsPerPage, total)}
                    </span>
                    {' '}건
                  </p>
                </div>
                <div className="flex items-center space-x-3 bg-gray-50 px-6 py-3 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">페이지당 데이터</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="block w-32 pl-3 pr-10 py-2 text-sm bg-white border border-gray-200 text-gray-700 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-300"
                  >
                    <option value={15}>15개</option>
                    <option value={30}>30개</option>
                    <option value={50}>50개</option>
                    <option value={9999}>전체</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 코드 목록 테이블 */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border border-gray-200 rounded-xl">
                  <table className="min-w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {renderSortableHeader('sales_code', '판매 코드')}
                        {renderSortableHeader('product_name', '상품명')}
                        {renderSortableHeader('set_qty', '세트수량')}
                        {renderSortableHeader('product_code', '상품코드')}
                        {renderSortableHeader('sales_price', '판매가격')}
                        {renderSortableHeader('weight', '무게(kg)')}
                        {renderSortableHeader('sales_site', '판매 사이트')}
                        {renderSortableHeader('site_url', '사이트 URL')}
                        <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {codes.map((code, index) => (
                        <tr 
                          key={`${code.sales_code}-${index}`}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="whitespace-nowrap py-4 pl-6 pr-4 text-sm font-medium text-gray-900 truncate">{code.sales_code}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 truncate">{code.product_name}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 text-center">{code.set_qty}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 truncate">{code.product_code}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 text-right">{code.sales_price.toLocaleString()}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 text-right">{(code.weight || 0).toFixed(2)}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 truncate">{code.sales_site}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 truncate">
                            {code.site_url ? (
                              <a 
                                href={code.site_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {code.site_url}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
                            <div className="flex gap-3">
                              <button
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                onClick={() => handleEdit(code)}
                              >
                                <FaEdit className="w-4 h-4" />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 transition-colors"
                                onClick={() => handleDelete(code.sales_code)}
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
              </div>
            </div>

            {/* 페이지네이션 */}
            <div className="flex items-center justify-center mt-6">
              <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-xl px-4 py-3 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">이전</span>
                  <FaChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="relative inline-flex items-center px-4 py-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-xl px-4 py-3 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">다음</span>
                  <FaChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* 코드 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingCode ? '코드 수정' : '코드 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">판매 코드</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.sales_code}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_code: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">상품명</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.product_name}
                    onChange={(e) =>
                      setFormData({ ...formData, product_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">세트수량</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.set_qty}
                    onChange={(e) =>
                      setFormData({ ...formData, set_qty: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">상품코드</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.product_code}
                    onChange={(e) =>
                      setFormData({ ...formData, product_code: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">판매가격</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.sales_price}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_price: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">무게(kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">판매 사이트</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.sales_site}
                    onChange={(e) =>
                      setFormData({ ...formData, sales_site: e.target.value })
                    }
                  >
                    <option value="">선택하세요</option>
                    {salesSites.map((site) => (
                      <option key={site.code} value={site.code}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">사이트 URL</label>
                  <input
                    type="url"
                    className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    value={formData.site_url}
                    onChange={(e) =>
                      setFormData({ ...formData, site_url: e.target.value })
                    }
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingCode(null)
                    resetFormData()
                  }}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {editingCode ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 전체 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">전체 삭제 확인</h2>
            <p className="mb-6 text-gray-600">다음 수식의 답을 입력하세요: <span className="font-semibold text-gray-900">{equation}</span></p>
            <input
              type="number"
              className="w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all mb-6"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="답을 입력하세요"
            />
            <div className="flex justify-end gap-3">
              <button
                className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setUserAnswer('')
                }}
              >
                취소
              </button>
              <button
                className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                onClick={handleVerifyAndDelete}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 