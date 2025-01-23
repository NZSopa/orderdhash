import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { FaFileUpload } from 'react-icons/fa'

export default function FileUpload({ onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 확장자 체크
    const fileExt = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      toast.error('엑셀 또는 CSV 파일만 업로드 가능합니다.')
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/shipment/complete', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      toast.success('출하 완료 처리가 완료되었습니다.')
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error(error.message || '파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      e.target.value = '' // 파일 입력 초기화
    }
  }

  return (
    <div>
      <input
        type="file"
        id="shipment-file-upload"
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <button
        onClick={() => document.getElementById('shipment-file-upload').click()}
        disabled={isUploading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
      >
        <FaFileUpload className="w-4 h-4" />
        {isUploading ? '업로드 중...' : '출하 완료 파일 업로드'}
      </button>
    </div>
  )
} 