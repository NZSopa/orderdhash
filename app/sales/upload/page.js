'use client'

import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.jsx'

export default function SalesUploadPage() {
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // txt 파일만 허용
    if (!file.name.endsWith('.txt')) {
      toast({
        title: '오류',
        description: 'txt 파일만 업로드 가능합니다.',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('channel', 'Amazon Japan nzplus')

      const response = await fetch('/api/sales/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '파일 업로드에 실패했습니다.')
      }

      toast({
        title: '성공',
        description: data.message || '파일이 성공적으로 업로드되었습니다.',
      })

      // 파일 입력 초기화
      event.target.value = ''
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: '오류',
        description: error.message || '파일 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>판매 데이터 업로드</CardTitle>
          <CardDescription>
            Amazon Japan NZPLUS의 판매 데이터를 업로드합니다.
            <br />
            아래의 필드가 포함된 txt 파일을 업로드해주세요:
            <br />
            - 出品者SKU (판매자 SKU)
            <br />
            - 価格 (판매가)
            <br />
            - 数量 (수량)
            <br />
            <br />
            * 파일의 필드명이 정확히 일치해야 합니다.
            <br />
            * 파일은 탭으로 구분된 텍스트(.txt) 형식이어야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            {uploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 