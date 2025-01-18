import { useState, useRef } from 'react'
import { FaUpload, FaSpinner } from 'react-icons/fa'
import * as XLSX from 'xlsx'

export default function FileUpload({ onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('파일을 선택해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const workbook = XLSX.read(await selectedFile.arrayBuffer())
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet)

      console.log('Parsed Excel data:', data[0]) // 데이터 구조 확인용 로그

      // 필수 필드 확인
      const requiredFields = ['product_code', 'product_name', 'nz_stock', 'aus_stock']
      const missingFields = requiredFields.filter(field => !data[0]?.hasOwnProperty(field))
      
      if (missingFields.length > 0) {
        throw new Error(`필수 필드가 누락되었습니다: ${missingFields.join(', ')}`)
      }

      const processedData = data.map(item => ({
        product_code: item.product_code?.toString(),
        product_name: item.product_name?.toString(),
        nz_stock: parseInt(item.nz_stock) || 0,
        aus_stock: parseInt(item.aus_stock) || 0,
        memo: item.memo?.toString() || ''
      }))

      console.log('Processed data:', processedData[0]) // 변환된 데이터 확인용 로그

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData)
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '재고 등록 중 오류가 발생했습니다.')
      }

      setUploadResult({
        success: true,
        total: result.summary.total,
        success: result.summary.success,
        error: result.summary.error,
        duplicates: result.duplicateErrors || []
      })
      
      if (typeof onUploadComplete === 'function') {
        onUploadComplete()
      }

    } catch (error) {
      console.error('Error uploading file:', error)
      setError(error.message || '파일 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('Excel 파일(.xlsx 또는 .xls)만 업로드 가능합니다.')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('Excel 파일(.xlsx 또는 .xls)만 업로드 가능합니다.')
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center 
            ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}
            hover:border-indigo-300 hover:bg-indigo-50 transition-colors
            cursor-pointer`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center space-y-2">
            <FaUpload className="w-8 h-8 text-gray-400" />
            <div className="text-sm text-gray-600">
              {selectedFile ? (
                <span className="text-indigo-600 font-medium">{selectedFile.name}</span>
              ) : (
                <>
                  <span className="font-medium">파일을 선택</span>하거나 이 영역에 드래그하세요
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Excel 파일 형식(.xlsx, .xls)
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedFile || loading}
            className={`
              px-4 py-2 rounded-md text-sm font-medium text-white
              ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              flex items-center space-x-2
            `}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>처리중...</span>
              </>
            ) : (
              <>
                <FaUpload />
                <span>업로드</span>
              </>
            )}
          </button>
        </div>
      </form>

      {uploadResult && (
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            업로드 결과
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-2xl font-bold text-gray-900">
                {uploadResult.total}
              </div>
              <div className="text-sm text-gray-600">전체</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-md">
              <div className="text-2xl font-bold text-green-600">
                {uploadResult.success}
              </div>
              <div className="text-sm text-green-600">성공</div>
            </div>
            
            <div className="bg-red-50 p-3 rounded-md">
              <div className="text-2xl font-bold text-red-600">
                {uploadResult.error}
              </div>
              <div className="text-sm text-red-600">실패</div>
            </div>
          </div>

          {uploadResult.duplicates.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                중복된 상품 코드
              </h4>
              <div className="space-y-2">
                {uploadResult.duplicates.map((dup, index) => (
                  <div
                    key={index}
                    className="text-sm bg-yellow-50 p-2 rounded flex justify-between items-center"
                  >
                    <span className="text-gray-900">{dup.product_code}</span>
                    <span className="text-yellow-600">{dup.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 