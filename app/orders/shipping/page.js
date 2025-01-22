'use client'

import React, { useState, useEffect } from 'react'
import { FaSearch, FaFileExcel, FaDownload, FaPlus } from 'react-icons/fa'

export default function ShippingPage() {
  const [shippingList, setShippingList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    sl_number: '',
    sales_site: '',
    consignee_name: '',
    product_code: '',
    product_name: '',
    set_qty: 1,
    quantity: 1,
    shipping_country: '',
    tracking_number: '',
    shipping_date: '',
    order_date: '',
    weight: 0
  })

  useEffect(() => {
    loadShippingList()
  }, [searchQuery, currentPage, itemsPerPage])

  const loadShippingList = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchQuery && { query: searchQuery })
      })

      const response = await fetch(`/api/shipping?${queryParams}`)
      const data = await response.json()
      
      if (response.ok) {
        setShippingList(data.data || [])
        setTotalItems(data.total || 0)
      }
    } catch (error) {
      console.error('Error loading shipping list:', error)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (response.ok) {
        setIsModalOpen(false)
        resetFormData()
        await loadShippingList()
      } else {
        alert(data.error || '출하 정보 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving shipping info:', error)
      alert('출하 정보 저장 중 오류가 발생했습니다.')
    }
  }

  const resetFormData = () => {
    setFormData({
      sl_number: '',
      sales_site: '',
      consignee_name: '',
      product_code: '',
      product_name: '',
      set_qty: 1,
      quantity: 1,
      shipping_country: '',
      tracking_number: '',
      shipping_date: '',
      order_date: '',
      weight: 0
    })
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-8">출하 처리</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">출하 파일 업로드</h2>
            <div className="flex items-center gap-4">
              <input
                type="file"
                className="file-input file-input-bordered w-full max-w-xs"
                accept=".xlsx,.xls"
              />
              <button className="btn btn-primary">업로드</button>
            </div>
          </div>

          <div className="divider"></div>

          <div>
            <h2 className="text-lg font-semibold mb-4">출하 리스트 다운로드</h2>
            <div className="flex flex-wrap gap-4">
              <button className="btn btn-outline">KSE 업로드 파일</button>
              <button className="btn btn-outline">SSS 업로드 파일</button>
              <button className="btn btn-outline">AUS 출하 리스트</button>
              <button className="btn btn-outline">NZ 출하 리스트</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 