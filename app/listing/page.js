'use client'

import { FaFileUpload } from 'react-icons/fa'
import PriceFileUpload from '@/app/components/sales_prices/PriceFileUpload'
import Papa from 'papaparse'
import { useState } from 'react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/app/components/ui/table'
import { Button } from '@/app/components/ui/button'
import Image from 'next/image'

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export default function PricePage() {
  // Shopify 상품 데이터 상태
  const [shopifyProducts, setShopifyProducts] = useState([])
  const [shopifyFileName, setShopifyFileName] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState(null)

  // Shopify 파일 업로드 핸들러
  const handleShopifyFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setShopifyFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // 필요한 컬럼만 추출
        const products = results.data.map(row => ({
          image: row['Image Src'],
          title: row['Title'],
          cost: row['Cost per item'],
          price: row['Variant Price'],
        }))
        setShopifyProducts(products)
      },
      error: (err) => {
        alert('CSV 파싱 오류: ' + err.message)
      }
    })
  }

  // 모달 열기
  const openProductModal = (product) => {
    setModalProduct(product)
    setModalOpen(true)
  }
  // 모달 닫기
  const closeProductModal = () => {
    setModalOpen(false)
    setModalProduct(null)
  }

  return (
    <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
     
      {/* Shopify 상품정보 업로드 */}
      <div className="bg-white rounded-xl shadow-sm mt-8">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopify 상품정보 업로드</h1>
            <p className="mt-1 text-sm text-gray-500">
              Shopify 상품정보 CSV 파일을 업로드하면 상품 목록을 미리 볼 수 있습니다.<br />
              (제품사진, 제품명, 원가, 판매가만 표시)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn bg-blue-500 hover:bg-blue-600 text-white gap-2"
              onClick={() => document.getElementById('shopify-file-upload')?.click()}
            >
              <FaFileUpload className="w-4 h-4" />
              상품정보 파일 업로드
            </button>
            <input
              type="file"
              id="shopify-file-upload"
              accept=".csv"
              onChange={handleShopifyFile}
              className="hidden"
            />
          </div>
        </div>
        <div className="p-6">
          {shopifyFileName && (
            <div className="mb-4 text-sm text-gray-600">업로드 파일: {shopifyFileName}</div>
          )}
          {shopifyProducts.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제품사진</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead>원가</TableHead>
                  <TableHead>판매가</TableHead>
                  <TableHead>상세보기</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shopifyProducts.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {p.image ? <Image src={p.image} alt={p.title} width={160} height={160} className="w-16 h-16 object-contain" /> : '-'}
                    </TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>{p.cost}</TableCell>
                    <TableCell>{p.price}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openProductModal(p)}>
                        제품보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      {/* 상품정보 모달 */}
      {modalOpen && modalProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative">
            <button onClick={closeProductModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">×</button>
            <h2 className="text-xl font-bold mb-4">상품 상세 정보</h2>
            <div className="flex gap-6">
              {modalProduct.image && (
                <Image src={modalProduct.image} alt={modalProduct.title} width={160} height={160} className="w-40 h-40 object-contain border" />
              )}
              <div className="flex-1 space-y-2">
                {Object.entries(modalProduct).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-semibold text-gray-700 mr-2">{key}:</span>
                    {key === 'Body (HTML)'
                      ? <span className="text-gray-900 break-all whitespace-pre-line">{stripHtml(value)}</span>
                      : <span className="text-gray-900 break-all">{String(value)}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 