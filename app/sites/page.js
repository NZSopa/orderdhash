'use client'

import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa'

export default function SitesPage() {
  const [salesSites, setSalesSites] = useState([])
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState(null)
  const [siteFormData, setSiteFormData] = useState({
    code: '',
    name: '',
    site_url: ''
  })

  useEffect(() => {
    loadSalesSites()
  }, [])

  const loadSalesSites = async () => {
    try {
      const response = await fetch('/api/sites')
      const data = await response.json()
      if (data.error) {
        console.error('Error loading sales sites:', data.error)
        return
      }
      setSalesSites(data.data || [])
    } catch (error) {
      console.error('Error loading sales sites:', error)
    }
  }

  const handleSiteSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteFormData)
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        setIsSiteModalOpen(false)
        setEditingSite(null)
        resetSiteFormData()
        await loadSalesSites()
      } else {
        alert(data.error || '판매 사이트 저장 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving sales site:', error)
      alert('판매 사이트 저장 중 오류가 발생했습니다.')
    }
  }

  const handleEditSite = (site) => {
    setEditingSite(site)
    setSiteFormData({
      id: site.id || '',
      code: site.code || '',
      name: site.name || '',
      site_url: site.site_url || ''
    })
    setIsSiteModalOpen(true)
  }

  const handleDeleteSite = async (code) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/sites?code=${encodeURIComponent(code)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        alert('판매 사이트가 삭제되었습니다.')
        await loadSalesSites()
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting sales site:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const resetSiteFormData = () => {
    setSiteFormData({
      id: '',
      code: '',
      name: '',
      site_url: ''
    })
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">판매 사이트 관리</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingSite(null)
            resetSiteFormData()
            setIsSiteModalOpen(true)
          }}
        >
          <FaPlus className="mr-2" />
          사이트 추가
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>사이트 코드</th>
              <th>사이트명</th>
              <th>사이트 URL</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {salesSites.map((site) => (
              <tr key={site.code} className="hover:bg-gray-50">
                <td>{site.code}</td>
                <td>{site.name}</td>
                <td>
                  {site.site_url ? (
                    <a 
                      href={site.site_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {site.site_url}
                    </a>
                  ) : '-'}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => handleEditSite(site)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost text-red-500"
                      onClick={() => handleDeleteSite(site.code)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 사이트 추가/수정 모달 */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingSite ? '사이트 수정' : '사이트 추가'}
            </h2>
            <form onSubmit={handleSiteSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">사이트 코드</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={siteFormData.code}
                    onChange={(e) =>
                      setSiteFormData({ ...siteFormData, code: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">사이트명</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={siteFormData.name}
                    onChange={(e) =>
                      setSiteFormData({ ...siteFormData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">사이트 URL</label>
                  <input
                    type="url"
                    className="input input-bordered w-full"
                    value={siteFormData.site_url}
                    onChange={(e) =>
                      setSiteFormData({ ...siteFormData, site_url: e.target.value })
                    }
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsSiteModalOpen(false)
                    setEditingSite(null)
                    resetSiteFormData()
                  }}
                >
                  취소
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSite ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 