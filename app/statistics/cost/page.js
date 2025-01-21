'use client'

import { useState, useEffect } from 'react'
import { FaSearch, FaChartPie, FaArrowUp, FaArrowDown } from 'react-icons/fa'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function CostAnalysisPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [compareType, setCompareType] = useState('prev')
  const [compareMonth, setCompareMonth] = useState('')
  const [displayCount, setDisplayCount] = useState(10)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null) // 'increased' or 'decreased'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredCell, setHoveredCell] = useState(null)
  const [clickedCell, setClickedCell] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  // 전월 계산 함수 추가
  const getPreviousMonth = (yearMonth) => {
    const [year, month] = yearMonth.split('-').map(num => parseInt(num))
    if (month === 1) {
      return `${year - 1}-12`
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const yearMonth = `${selectedYear}-${selectedMonth}`
      const params = new URLSearchParams({
        month: yearMonth,
        compareType
      })

      if (compareType === 'custom' && compareMonth) {
        params.append('compareMonth', compareMonth)
      }

      console.log('Fetching data with params:', Object.fromEntries(params))
      const response = await fetch(`/api/statistics/cost?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        console.error('Failed to fetch data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (compareType === 'custom') {
      const [year, month] = compareMonth.split('-')
      if (!year || !month) {
        return
      }
    }
    fetchData()
  }, [selectedYear, selectedMonth, compareType, compareMonth])

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg 브레이크포인트
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 모달 외부 클릭 시 클릭된 셀 초기화
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.tooltip-trigger')) {
        setClickedCell(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const chartData = data ? {
    labels: [
      ...data.top_increased.slice(0, displayCount).map(item => item.product_code),
      ...data.top_decreased.slice(0, displayCount).map(item => item.product_code)
    ],
    datasets: [
      {
        label: '가격 변동률 (%)',
        data: [
          ...data.top_increased.slice(0, displayCount).map(item => item.change_percent),
          ...data.top_decreased.slice(0, displayCount).map(item => item.change_percent)
        ],
        backgroundColor: [
          ...data.top_increased.slice(0, displayCount).map(() => 'rgba(239, 68, 68, 0.5)'),
          ...data.top_decreased.slice(0, displayCount).map(() => 'rgba(59, 130, 246, 0.5)')
        ],
        borderColor: [
          ...data.top_increased.slice(0, displayCount).map(() => 'rgb(239, 68, 68)'),
          ...data.top_decreased.slice(0, displayCount).map(() => 'rgb(59, 130, 246)')
        ],
        borderWidth: 1,
      },
    ],
  } : null

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '상위 가격 변동 제품',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const allItems = [
              ...data.top_increased.slice(0, displayCount),
              ...data.top_decreased.slice(0, displayCount)
            ]
            const item = allItems[context.dataIndex]
            return [
              `제품코드: ${item.product_code}`,
              `제품명: ${item.product_name}`,
              `변동률: ${item.change_percent.toFixed(1)}%`,
              `가격: ${item.previous_price.toLocaleString()} NZD → ${item.current_price.toLocaleString()} NZD`
            ]
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '변동률 (%)'
        }
      }
    }
  }

  // 모달 열기 함수
  const openModal = (type) => {
    setModalType(type)
    setCurrentPage(1)
    setShowModal(true)
  }

  // 정렬 함수
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // 정렬된 데이터 가져오기
  const getSortedData = (data) => {
    if (!sortConfig.key) return data

    return [...data].sort((a, b) => {
      if (sortConfig.key === 'change_percent') {
        return sortConfig.direction === 'asc' 
          ? a.change_percent - b.change_percent
          : b.change_percent - a.change_percent
      }
      if (sortConfig.key === 'previous_price' || sortConfig.key === 'current_price') {
        return sortConfig.direction === 'asc'
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key]
      }
      return sortConfig.direction === 'asc'
        ? a[sortConfig.key].localeCompare(b[sortConfig.key])
        : b[sortConfig.key].localeCompare(a[sortConfig.key])
    })
  }

  // 검색 및 정렬이 적용된 페이지네이션 데이터 가져오기
  const getPaginatedData = () => {
    if (!data || !modalType) return []
    
    const items = modalType === 'increased' 
      ? data.price_changes.filter(item => item.price_change > 0)
      : data.price_changes.filter(item => item.price_change < 0)

    // 검색 필터 적용
    const filteredItems = items.filter(item => 
      item.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // 정렬 적용
    const sortedItems = getSortedData(filteredItems)

    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedItems.slice(start, end)
  }

  // 전체 페이지 수 계산 (검색 결과 기준)
  const getTotalPages = () => {
    if (!data || !modalType) return 0
    
    const items = modalType === 'increased'
      ? data.price_changes.filter(item => item.price_change > 0)
      : data.price_changes.filter(item => item.price_change < 0)

    const filteredItems = items.filter(item =>
      item.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return Math.ceil(filteredItems.length / itemsPerPage)
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-4">원가 분석</h1>
          
          {/* 필터 섹션 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full md:w-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
            
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full md:w-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => (
                <option key={month} value={month}>{month}월</option>
              ))}
            </select>

            <select
              value={compareType}
              onChange={(e) => {
                setCompareType(e.target.value)
                setCompareMonth('')
              }}
              className="w-full md:w-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="prev">전월 대비</option>
              <option value="custom">특정 월 대비</option>
            </select>

            {compareType === 'custom' && (
              <div className="flex flex-col md:flex-row gap-2">
                <select
                  value={compareMonth.split('-')[0] || ''}
                  onChange={(e) => {
                    const year = e.target.value
                    const month = compareMonth.split('-')[1] || ''
                    setCompareMonth(month ? `${year}-${month}` : year)
                  }}
                  className="w-full md:w-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">연도 선택</option>
                  {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => 2020 + i).map(year => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
                <select
                  value={compareMonth.split('-')[1] || ''}
                  onChange={(e) => {
                    const year = compareMonth.split('-')[0] || ''
                    setCompareMonth(year ? `${year}-${e.target.value}` : '')
                  }}
                  className="w-full md:w-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">월 선택</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(month => (
                    <option key={month} value={month}>{month}월</option>
                  ))}
                </select>
              </div>
            )}

            <select
              value={displayCount}
              onChange={(e) => setDisplayCount(Number(e.target.value))}
              className="w-full md:w-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="5">TOP 5</option>
              <option value="10">TOP 10</option>
              <option value="20">TOP 20</option>
              <option value="30">TOP 30</option>
            </select>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 md:p-6">
          <div className="bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
               onClick={() => openModal('increased')}>
            <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2">가격 상승 제품</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-xl md:text-2xl font-bold text-blue-600">
                {data?.summary.increased_count || 0}
                <span className="text-sm font-normal ml-1">개</span>
              </p>
              {data?.summary.increased_count > 0 && (
                <span className="text-red-500 flex items-center text-sm">
                  <FaArrowUp className="mr-1" />
                  {data.summary.avg_increase.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-green-50 p-4 md:p-6 rounded-xl border border-green-100 cursor-pointer hover:bg-green-100 transition-colors"
               onClick={() => openModal('decreased')}>
            <h3 className="text-base md:text-lg font-semibold text-green-900 mb-2">가격 하락 제품</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-xl md:text-2xl font-bold text-green-600">
                {data?.summary.decreased_count || 0}
                <span className="text-sm font-normal ml-1">개</span>
              </p>
              {data?.summary.decreased_count > 0 && (
                <span className="text-blue-500 flex items-center text-sm">
                  <FaArrowDown className="mr-1" />
                  {data.summary.avg_decrease.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-purple-50 p-4 md:p-6 rounded-xl border border-purple-100">
            <h3 className="text-base md:text-lg font-semibold text-purple-900 mb-2">최대 상승률</h3>
            <p className="text-xl md:text-2xl font-bold text-purple-600">
              {data?.top_increased[0]?.change_percent.toFixed(1) || 0}%
            </p>
          </div>
          <div className="bg-orange-50 p-4 md:p-6 rounded-xl border border-orange-100">
            <h3 className="text-base md:text-lg font-semibold text-orange-900 mb-2">최대 하락률</h3>
            <p className="text-xl md:text-2xl font-bold text-orange-600">
              {data?.top_decreased[0]?.change_percent.toFixed(1) || 0}%
            </p>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="p-4 md:p-6">
          <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100">
            {loading ? (
              <div className="h-[300px] md:h-[400px] flex items-center justify-center">
                <div className="text-gray-500">데이터를 불러오는 중...</div>
              </div>
            ) : chartData ? (
              <div className="h-[300px] md:h-[400px]">
                <Bar data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-[300px] md:h-[400px] flex items-center justify-center">
                <div className="text-gray-500 flex flex-col items-center">
                  <FaChartPie className="w-8 h-8 md:w-12 md:h-12 mb-2" />
                  <p>데이터가 없습니다</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 상세 데이터 테이블 */}
        {data && (
          <div className="mt-4 md:mt-8 p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">상위 가격 변동 제품</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* 가격 상승 제품 */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-red-50 px-4 py-2 border-b border-red-100">
                  <h3 className="font-semibold text-red-900">가격 상승 TOP {displayCount}</h3>
                </div>
                <div className="divide-y divide-gray-200 overflow-x-auto">
                  {data.top_increased.slice(0, displayCount).map((item, index) => (
                    <div key={item.product_code} className="px-4 py-3">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">{index + 1}</span>
                          <span className="font-medium">{item.product_code}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            {item.previous_price.toLocaleString()} NZD → {item.current_price.toLocaleString()} NZD
                          </div>
                          <div className="flex items-center text-red-600">
                            <FaArrowUp className="mr-1" />
                            {item.change_percent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 pl-6 mt-1">{item.product_name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 가격 하락 제품 */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
                  <h3 className="font-semibold text-blue-900">가격 하락 TOP {displayCount}</h3>
                </div>
                <div className="divide-y divide-gray-200 overflow-x-auto">
                  {data.top_decreased.slice(0, displayCount).map((item, index) => (
                    <div key={item.product_code} className="px-4 py-3">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">{index + 1}</span>
                          <span className="font-medium">{item.product_code}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            {item.previous_price.toLocaleString()} NZD → {item.current_price.toLocaleString()} NZD
                          </div>
                          <div className="flex items-center text-blue-600">
                            <FaArrowDown className="mr-1" />
                            {Math.abs(item.change_percent).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 pl-6 mt-1">{item.product_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-[95vw] max-w-7xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {modalType === 'increased' ? '가격 상승 제품 목록' : '가격 하락 제품 목록'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-sm text-gray-600">
                  기준: {selectedYear}-{selectedMonth} / 
                  비교: {compareType === 'prev' ? getPreviousMonth(`${selectedYear}-${selectedMonth}`) : compareMonth}
                </div>
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    placeholder="제품 코드/제품명 검색..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th 
                      className="w-[15%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('product_code')}
                    >
                      제품 코드
                      {sortConfig.key === 'product_code' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="w-[40%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('product_name')}
                    >
                      제품명
                      {sortConfig.key === 'product_name' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="w-[15%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('previous_price')}
                    >
                      <div className="inline-flex flex-col items-end">
                        <span className="text-blue-600">비교 가격</span>
                        <span className="text-xs text-gray-400">(NZD)</span>
                      </div>
                      {sortConfig.key === 'previous_price' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="w-[15%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('current_price')}
                    >
                      <div className="inline-flex flex-col items-end">
                        <span className="text-red-600">기준 가격</span>
                        <span className="text-xs text-gray-400">(NZD)</span>
                      </div>
                      {sortConfig.key === 'current_price' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th 
                      className="w-[15%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('change_percent')}
                    >
                      변동률
                      {sortConfig.key === 'change_percent' && (
                        <span className="ml-1">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedData().map((item) => (
                    <tr key={item.product_code} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 truncate relative group">
                        <div 
                          className="truncate cursor-help tooltip-trigger"
                          onMouseEnter={() => isMobile && setHoveredCell(`code-${item.product_code}`)}
                          onMouseLeave={() => !clickedCell && setHoveredCell(null)}
                          onClick={() => {
                            if (isMobile) {
                              if (clickedCell === `code-${item.product_code}`) {
                                setClickedCell(null)
                              } else {
                                setClickedCell(`code-${item.product_code}`)
                                setHoveredCell(`code-${item.product_code}`)
                              }
                            }
                          }}
                        >
                          {item.product_code}
                        </div>
                        {isMobile && (hoveredCell === `code-${item.product_code}` || clickedCell === `code-${item.product_code}`) && (
                          <div className="absolute z-50 bg-black text-white text-sm rounded-md py-1 px-2 left-6 -top-2 whitespace-nowrap shadow-lg">
                            {item.product_code}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate relative group">
                        <div 
                          className="truncate cursor-help tooltip-trigger"
                          onMouseEnter={() => isMobile && setHoveredCell(`name-${item.product_code}`)}
                          onMouseLeave={() => !clickedCell && setHoveredCell(null)}
                          onClick={() => {
                            if (isMobile) {
                              if (clickedCell === `name-${item.product_code}`) {
                                setClickedCell(null)
                              } else {
                                setClickedCell(`name-${item.product_code}`)
                                setHoveredCell(`name-${item.product_code}`)
                              }
                            }
                          }}
                        >
                          {item.product_name}
                        </div>
                        {isMobile && (hoveredCell === `name-${item.product_code}` || clickedCell === `name-${item.product_code}`) && (
                          <div className="absolute z-50 bg-black text-white text-sm rounded-md py-2 px-3 -top-2 left-0 min-w-[200px] max-w-[400px] whitespace-normal break-words shadow-lg">
                            {item.product_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-600 text-right font-medium">
                        {item.previous_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 text-right font-medium">
                        {item.current_price.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-sm text-right font-bold ${
                        item.change_percent > 0 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-blue-600 bg-blue-50'
                      }`}>
                        {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 페이지네이션 */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                총 {getTotalPages() * itemsPerPage}개 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, getTotalPages() * itemsPerPage)}개
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} / {getTotalPages()} 페이지
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(getTotalPages(), prev + 1))}
                  disabled={currentPage === getTotalPages()}
                  className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 