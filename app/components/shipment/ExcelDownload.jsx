import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { FaFileDownload } from 'react-icons/fa'

export default function ExcelDownload() {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (type) => {
    try {
      setIsDownloading(true)
      const response = await fetch(`/api/shipment/export?type=${type}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }

      // 파일 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipment_${type}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('엑셀 파일이 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading excel:', error)
      toast.error(error.message)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDownload('kse')}
        disabled={isDownloading}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
      >
        <FaFileDownload className="w-4 h-4" />
        KSE
      </button>
      <button
        onClick={() => handleDownload('sss')}
        disabled={isDownloading}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
      >
        <FaFileDownload className="w-4 h-4" />
        SSS
      </button>
      <button
        onClick={() => handleDownload('aus')}
        disabled={isDownloading}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
      >
        <FaFileDownload className="w-4 h-4" />
        AUS
      </button>
      <button
        onClick={() => handleDownload('nz')}
        disabled={isDownloading}
        className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
      >
        <FaFileDownload className="w-4 h-4" />
        NZ
      </button>
    </div>
  )
} 