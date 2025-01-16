'use client'

import { useState, useEffect } from 'react'
import { FaPlus, FaSearch, FaExclamationTriangle } from 'react-icons/fa'
import Link from 'next/link'

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [inventoryItems, setInventoryItems] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    stock: 0,
    min_stock: 0
  })

  useEffect(() => {
    loadInventoryItems()
  }, [])

  const loadInventoryItems = async () => {
    try {
      const url = searchQuery 
        ? `/api/inventory?query=${encodeURIComponent(searchQuery)}`
        : '/api/inventory'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items')
      }
      const { data } = await response.json()
      setInventoryItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading inventory items:', error)
      setInventoryItems([])
    }
  }

  const handleSearch = async (e) => {
    setSearchQuery(e.target.value)
    if (!e.target.value) {
      loadInventoryItems()
    } else {
      try {
        const response = await fetch(`/api/inventory?query=${encodeURIComponent(e.target.value)}`)
        if (!response.ok) {
          throw new Error('Failed to search inventory items')
        }
        const { data } = await response.json()
        setInventoryItems(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error searching inventory items:', error)
        setInventoryItems([])
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('저장 실패')
      }

      setIsModalOpen(false)
      setEditingItem(null)
      setFormData({
        code: '',
        name: '',
        stock: 0,
        min_stock: 0
      })
      loadInventoryItems()
    } catch (error) {
      console.error('Error saving inventory item:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData(item)
    setIsModalOpen(true)
  }

  const handleDelete = async (code) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`/api/inventory?code=${encodeURIComponent(code)}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('삭제 실패')
        }

        loadInventoryItems()
      } catch (error) {
        console.error('Error deleting inventory item:', error)
        alert('삭제 중 오류가 발생했습니다.')
      }
    }
  }

  const lowStockItems = inventoryItems.filter(item => item.status === 'low')

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">재고 관리</h1>
      </div>

      {/* 재고 리스트 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="재고 검색..."
              className="pl-10 pr-4 py-2 border rounded-lg"
              value={searchQuery}
              onChange={handleSearch}
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <FaPlus /> 품목 추가
        </button>
      </div>

      {/* 재고 부족 알림 */}
      {lowStockItems.length > 0 && (
        <div className="alert alert-warning mb-6">
          <FaExclamationTriangle />
          <span>재고 부족 알림: {lowStockItems.length}개 품목의 재고가 부족합니다.</span>
        </div>
      )}

      {/* 재고 테이블 */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>품목 코드</th>
              <th>품목명</th>
              <th>현재 재고</th>
              <th>최소 재고</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  등록된 재고 품목이 없습니다.
                </td>
              </tr>
            ) : (
              inventoryItems.map((item) => (
                <tr key={item.code}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.stock}</td>
                  <td>{item.min_stock}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === 'low' ? 'badge-error' : 'badge-success'
                      }`}
                    >
                      {item.status === 'low' ? '부족' : '정상'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleEdit(item)}
                      >
                        수정
                      </button>
                      <button 
                        className="btn btn-sm btn-ghost text-red-500"
                        onClick={() => handleDelete(item.code)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 품목 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? '품목 수정' : '품목 추가'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">품목 코드</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">품목명</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">현재 재고</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: Number(e.target.value) })
                    }
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">최소 재고</label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={formData.min_stock}
                    onChange={(e) =>
                      setFormData({ ...formData, min_stock: Number(e.target.value) })
                    }
                    required
                    min="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingItem(null)
                  }}
                >
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 