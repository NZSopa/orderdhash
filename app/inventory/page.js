'use client'

import { FaFileUpload } from 'react-icons/fa'
import InventoryFileUpload from '../components/inventory/InventoryFileUpload'
import { useState } from 'react'

export default function InventoryPage() {
  const [sheetData, setSheetData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('')
  const [saveStats, setSaveStats] = useState(null)

  const handleFetchSheet = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory/sheet')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '불러오기 실패')
      setSheetData(json.data)
    } catch (err) {
      setError(err.message)
      setSheetData([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToDB = async () => {
    setSaveStatus('저장 중...')
    setSaveStats(null)
    try {
      const res = await fetch('/api/inventory/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: sheetData }),
      })
      const result = await res.json()
      if (result.success) {
        setSaveStatus('저장 완료!')
        setSaveStats({
          total: result.total,
          newCount: result.newCount,
          updateCount: result.updateCount,
          failCount: result.failCount,
        })
      } else {
        setSaveStatus(result.error || '저장 실패')
      }
    } catch (e) {
      setSaveStatus('저장 중 오류 발생')
    }
  }

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm">
        {/* 헤더 섹션 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">재고 관리</h1>
              <p className="mt-1 text-sm text-gray-500">
                엑셀 파일을 업로드하여 재고 정보를 관리할 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
                onClick={() => document.getElementById('inventory-file-upload')?.click()}
              >
                <FaFileUpload className="w-4 h-4" />
                재고 파일 업로드
              </button>
              <a
                href="/inventory-template.xlsx"
                download
                className="btn bg-green-500 hover:bg-green-600 text-white gap-2"
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <FaFileUpload className="w-4 h-4" />
                템플릿 다운로드
              </a>
              <button
                className="btn bg-yellow-500 hover:bg-yellow-600 text-white gap-2"
                onClick={handleFetchSheet}
                disabled={loading}
              >
                {loading ? '불러오는 중...' : '구글 시트에서 재고 불러오기'}
              </button>
            </div>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="p-6 space-y-6">
          <InventoryFileUpload />
          {error && (
            <div className="text-red-500">{error}</div>
          )}
          {sheetData.length > 0 && (
            <>
              <div className="flex gap-3 mb-2">
                <button
                  className="btn bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  onClick={handleSaveToDB}
                  disabled={!!saveStatus && saveStatus.includes('저장 중')}
                >
                  {saveStatus && saveStatus.includes('저장 중') ? '저장 중...' : '재고데이터 업데이트'}
                </button>
                {saveStatus && <div className="flex items-center text-sm text-gray-700">{saveStatus}</div>}
              </div>
              {saveStats && (
                <div className="bg-gray-50 border rounded p-3 text-sm flex gap-6">
                  <div>총 처리: <span className="font-bold">{saveStats.total}</span></div>
                  <div>신규 저장: <span className="font-bold text-green-600">{saveStats.newCount}</span></div>
                  <div>업데이트: <span className="font-bold text-blue-600">{saveStats.updateCount}</span></div>
                  <div>실패: <span className="font-bold text-red-600">{saveStats.failCount}</span></div>
                </div>
              )}
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(sheetData[0]).map((header) => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sheetData.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 