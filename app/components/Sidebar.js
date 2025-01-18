'use client'

import Link from 'next/link'
import { FaBox, FaClipboardList, FaStore, FaShoppingCart, FaBars, FaChevronRight, FaChevronDown } from 'react-icons/fa'
import { useState, useEffect } from 'react'
import { Disclosure } from '@headlessui/react'
import { usePathname } from 'next/navigation'

const menuItems = [
  {
    name: '주문 관리',
    icon: FaShoppingCart,
    items: [
      { name: '주문 업로드', href: '/orders' },
      { name: '주문 목록', href: '/orders/list' },
    ],
  },
  {
    name: '재고 관리',
    icon: FaBox,
    items: [
      { name: '재고 업로드', href: '/inventory' },
      { name: '재고 목록', href: '/inventory/list' },
    ],
  },
  {
    name: '상품 관리',
    icon: FaStore,
    items: [
      { name: '상품 코드', href: '/codes' },
      { name: '판매 사이트', href: '/sites' },
    ],
  },
]

export default function Sidebar() {
  const [isMenuOpen, setIsMenuOpen] = useState(true)
  const pathname = usePathname()

  const isActive = (href) => pathname === href

  return (
    <aside className={`transition-all duration-300 ${isMenuOpen ? 'w-64' : 'w-20'} bg-white shadow-md`}>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          {isMenuOpen && <span className="text-lg font-semibold">Order Dash</span>}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FaBars className="w-6 h-6" />
          </button>
        </div>

        <nav className={`flex-1 ${isMenuOpen ? 'p-4' : 'p-2'}`}>
          {menuItems.map((section) => (
            <Disclosure
              key={section.name}
              as="div"
              className="mb-4"
              defaultOpen={section.items.some(item => pathname.startsWith(item.href))}
            >
              {({ open }) => (
                <>
                  <Disclosure.Button
                    className="flex items-center justify-between w-full p-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="flex items-center">
                      <section.icon className={`w-5 h-5 ${isMenuOpen ? 'mr-2' : ''}`} />
                      {isMenuOpen && <span className="font-medium">{section.name}</span>}
                    </div>
                    {isMenuOpen && (
                      open ? (
                        <FaChevronDown className="w-4 h-4" />
                      ) : (
                        <FaChevronRight className="w-4 h-4" />
                      )
                    )}
                  </Disclosure.Button>

                  <Disclosure.Panel className={`mt-2 ${isMenuOpen ? 'ml-4' : 'ml-0'} space-y-2`}>
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          flex items-center p-2 text-sm rounded-lg
                          ${isActive(item.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                          }
                        `}
                        title={!isMenuOpen ? item.name : undefined}
                      >
                        {isMenuOpen ? item.name : '•'}
                      </Link>
                    ))}
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          ))}
        </nav>
      </div>
    </aside>
  )
} 