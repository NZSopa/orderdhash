import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'
import { FaBars } from 'react-icons/fa'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Order Dashboard',
  description: '주문 관리 대시보드',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" data-theme="light">
      <body className={inter.className}>
        <div className="drawer lg:drawer-open">
          <input id="drawer-toggle" type="checkbox" className="drawer-toggle" />
          <div className="drawer-content bg-base-200">
            {/* 모바일 햄버거 메뉴 */}
            <div className="lg:hidden sticky top-0 z-50 flex items-center p-4 bg-base-100 shadow-sm">
              <label htmlFor="drawer-toggle" className="btn btn-square btn-ghost">
                <FaBars className="h-5 w-5" />
              </label>
            </div>
            <main className="min-h-screen p-8">
              {children}
            </main>
          </div>
          <Sidebar />
        </div>
      </body>
    </html>
  )
}
