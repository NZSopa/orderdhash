'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useToast } from '../components/ui/use-toast'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

const SALES_CHANNELS = [
  'Amazon Japan nzplus',
  'Amazon Japan skywell',
  'Amazon USA nzplus',
  'Yahoo Japan',
  'eBay',
  'Qoo10',
  'NZGift'
]

export default function SalesPage() {
  const [sales, setSales] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [exchangeRates, setExchangeRates] = useState(null)
  const { toast } = useToast()
  const router = useRouter()

  // 환율 정보 가져오기
  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('/api/exchange-rates')
      if (!response.ok) {
        throw new Error('환율 정보를 가져오는데 실패했습니다.')
      }
      const { data } = await response.json()
      setExchangeRates(data)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      toast({
        title: '오류',
        description: error.message || '환율 정보를 가져오는데 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  // 판매 데이터 가져오기
  const fetchSales = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/sales?page=${page}&search=${search}`
      )
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
      })
      
      const responseData = await response.json()
      console.log('API Data:', responseData)

      if (!response.ok) {
        throw new Error(responseData.error || '판매 데이터를 가져오는데 실패했습니다.')
      }
      
      const { success, data, totalPages: total } = responseData
      if (!success) {
        throw new Error(responseData.error || '판매 데이터를 가져오는데 실패했습니다.')
      }
      
      setSales(data || [])
      setTotalPages(total || 1)
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast({
        title: '오류',
        description: error.message || '판매 데이터를 가져오는데 실패했습니다.',
        variant: 'destructive',
      })
      setSales([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // 이익 계산 함수
  const calculateProfit = (sale) => {
    if (!exchangeRates || !sale.unit_price) return ''

    const { sales_channel, sales_price, unit_price, qty, shipping_fee = 0, set_qty = 1 } = sale
    const { jpy_nzd, usd_nzd } = exchangeRates

    switch (sales_channel) {
      case 'Amazon Japan nzplus':
      case 'Amazon Japan skywell':
        return qty > 0 ? (sales_price * 0.9 * jpy_nzd - unit_price - shipping_fee) : ''
      
      case 'Amazon USA nzplus':
        return qty > 0 ? (sales_price * 0.9 * usd_nzd - unit_price - shipping_fee) : ''
      
      case 'eBay':
        return qty > 0 ? (sales_price * 0.8 * usd_nzd - unit_price * set_qty - shipping_fee) : ''
      
      case 'Qoo10':
        return (sales_price * 0.8754) * (jpy_nzd - 0.00151) - unit_price - shipping_fee
      
      case 'NZGift':
        return ((sales_price * 0.965) - 0.3) * 0.98 - unit_price
      
      default:
        return ''
    }
  }

  useEffect(() => {
    fetchSales()
  }, [page, search])

  useEffect(() => {
    fetchExchangeRates()
    // 1시간마다 환율 정보 업데이트
    const interval = setInterval(fetchExchangeRates, 3600000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">판매 관리</h1>
        <div className="flex gap-4">
          <Input
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setPage(1)}>검색</Button>
          <Button onClick={() => router.push('/sales/upload')} variant="outline">
            데이터 업로드
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>제품 코드</TableHead>
              <TableHead>제품명</TableHead>
              <TableHead>판매가</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>원가</TableHead>
              <TableHead>NZ 재고</TableHead>
              <TableHead>AUS 재고</TableHead>
              <TableHead>판매 채널</TableHead>
              <TableHead>무게(g)</TableHead>
              <TableHead>배송지</TableHead>
              <TableHead>이익</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-4">
                  데이터를 불러오는 중...
                </TableCell>
              </TableRow>
            ) : !sales || sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-4">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.site_sku}</TableCell>
                  <TableCell>{sale.product_code}</TableCell>
                  <TableCell>{sale.product_name}</TableCell>
                  <TableCell>{sale.sales_price}</TableCell>
                  <TableCell>{sale.qty}</TableCell>
                  <TableCell>{sale.unit_price}</TableCell>
                  <TableCell>{sale.nz_stock}</TableCell>
                  <TableCell>{sale.aus_stock}</TableCell>
                  <TableCell>{sale.sales_channel}</TableCell>
                  <TableCell>{sale.weight}</TableCell>
                  <TableCell>{sale.shipping_from}</TableCell>
                  <TableCell>{calculateProfit(sale).toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        <Button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          이전
        </Button>
        <Button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          다음
        </Button>
      </div>
    </div>
  )
} 