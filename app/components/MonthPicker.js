'use client'

import { useState, useEffect, useRef } from 'react'
import { FaCalendar } from 'react-icons/fa'

export default function MonthPicker({ value, onChange, minYear = 2022 }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(value ? parseInt(value.split('-')[0]) : new Date().getFullYear())
  const ref = useRef(null)

  const currentYear = new Date().getFullYear()
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: `${i + 1}월`
  }))
  const years = Array.from(
    { length: currentYear - minYear + 1 },
    (_, i) => minYear + i
  ).reverse()

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleYearChange = (year) => {
    setSelectedYear(year)
  }

  const handleMonthSelect = (month) => {
    onChange(`${selectedYear}-${month}`)
    setIsOpen(false)
  }

  const formatDisplayValue = () => {
    if (!value) return '정산월 선택'
    const [year, month] = value.split('-')
    return `${year}년 ${parseInt(month)}월`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <FaCalendar className="text-gray-400" />
        <span>{formatDisplayValue()}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border rounded-lg shadow-lg p-4 min-w-[240px]">
          <div className="flex gap-2 mb-4">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className={`px-2 py-1 rounded hover:bg-blue-50 ${
                !value ? 'bg-blue-100 text-blue-600' : ''
              }`}
            >
              전체
            </button>
            {months.map(month => (
              <button
                key={month.value}
                onClick={() => handleMonthSelect(month.value)}
                className={`px-2 py-1 rounded hover:bg-blue-50 ${
                  value === `${selectedYear}-${month.value}`
                    ? 'bg-blue-100 text-blue-600'
                    : ''
                }`}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 