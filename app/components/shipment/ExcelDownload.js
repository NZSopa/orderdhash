import { useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function ExcelDownload() {
  const searchParams = useSearchParams()
  const location = searchParams.get('location') || 'all'

  const handleDownload = async () => {
    try {
      if (location === 'all') {
        toast.error('출하 위치를 선택해주세요.')
        return
      }

      const response = await fetch(`/api/shipment/download?location=${location}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipments_${location}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('출하 목록이 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading shipment data:', error)
      toast.error(error.message)
    }
  }

  const handleDownloadSSS = async () => {
    try {
      if (location === 'all') {
        toast.error('출하 위치를 선택해주세요.')
        return
      }

      const response = await fetch(`/api/shipment/download-sss?location=${location}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '다운로드 중 오류가 발생했습니다.')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SSS_${location}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('SSS 파일이 다운로드되었습니다.')
    } catch (error) {
      console.error('Error downloading SSS data:', error)
      toast.error(error.message)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleDownload}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        출하목록 다운로드
      </button>
      <button
        onClick={handleDownloadSSS}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        SSS 다운로드
      </button>
    </div>
  )
} 