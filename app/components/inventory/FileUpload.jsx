import { useState, useRef } from 'react'
import { FaUpload, FaSpinner } from 'react-icons/fa'
import * as XLSX from 'xlsx'

export default function FileUpload({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const processExcelFile = async (file) => {
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          // 필수 필드 확인
          const requiredFields = ['product_code', 'product_name', 'nz_stock', 'aus_stock']
          const hasAllFields = requiredFields.every(field => 
            Object.keys(jsonData[0] || {}).some(key => 
              key.toLowerCase().replace(/\s+/g, '_') === field
            )
          )

          if (!hasAllFields) {
            throw new Error('필수 필드가 누락되었습니다. (상품코드, 상품명, NZ재고, AU재고)')
          }

          await handleUpload(jsonData)
        } catch (error) {
          setError(error.message)
          setSelectedFile(null)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      setError('파일 처리 중 오류가 발생했습니다.')
      setSelectedFile(null)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setError(null)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    setSelectedFile(file)
    await processExcelFile(file)
  }

  const handleFileSelect = async (e) => {
    setError(null)
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.')
      return
    }

    setSelectedFile(file)
    await processExcelFile(file)
  }

  const handleUpload = async (data) => {
    setUploading(true)
    setError(null)

    try {
      // 데이터 전처리: 필드명 정규화 및 데이터 타입 변환
      const processedData = data.map(item => ({
        product_code: String(item.product_code || '').trim(),
        product_name: String(item.product_name || '').trim(),
        nz_stock: parseInt(item.nz_stock) || 0,
        aus_stock: parseInt(item.aus_stock) || 0,
        memo: String(item.memo || '').trim()
      }))

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: processedData // stocks -> items로 변경
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '재고 업로드 중 오류가 발생했습니다.')
      }

      setUploadResult({
        success: true,
        total: result.summary?.total || 0,
        success: result.summary?.success || 0,
        error: (result.summary?.error || 0) + (result.duplicateErrors?.length || 0),
        duplicates: result.duplicateErrors?.map(error => ({
          reference_no: error.product_code, // reference_no -> product_code로 변경
          message: error.message || '이미 등록된 상품코드가 존재합니다.',
          details: error.details || null
        })) || []
      })

      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message)
    } finally {
      setUploading(false)
      setSelectedFile(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* 드래그 앤 드롭 영역 */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-gray-100'
        } transition-all duration-200 ease-in-out cursor-pointer`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".xlsx,.xls"
          className="hidden"
        />
        
        <div className="space-y-2">
          <div className="flex justify-center">
            <FaUpload className="h-12 w-12 text-gray-400" />
          </div>
          <div className="text-gray-600">
            <span className="font-medium text-indigo-600">파일을 선택</span>하거나 
            이 영역에 파일을 끌어다 놓으세요
          </div>
          <p className="text-sm text-gray-500">
            (엑셀 파일 .xlsx, .xls)
          </p>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 업로드 결과 */}
      {uploadResult && (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-4 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">업로드 결과</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{uploadResult.total}</div>
                <div className="mt-1 text-sm text-gray-500">전체 주문</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
                <div className="mt-1 text-sm text-gray-500">등록 성공</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{uploadResult.error}</div>
                <div className="mt-1 text-sm text-gray-500">등록 실패</div>
              </div>
            </div>

            {uploadResult.duplicates.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">중복 상품코드</h4>
                <div className="space-y-2">
                  {uploadResult.duplicates.map((dup, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{dup.reference_no}</span>
                        <span className="font-medium text-yellow-600">중복</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {dup.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
            <FaSpinner className="h-5 w-5 text-indigo-600 animate-spin" />
            <span className="text-gray-700">업로드 중...</span>
          </div>
        </div>
      )}
    </div>
  )
} 