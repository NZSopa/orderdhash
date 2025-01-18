import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Order Dashboard',
  description: '주문 관리 대시보드',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden bg-gray-100">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
