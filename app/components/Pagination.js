export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = []
  
  // 페이지 번호 생성
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || // 첫 페이지
      i === totalPages || // 마지막 페이지
      (i >= currentPage - 2 && i <= currentPage + 2) // 현재 페이지 기준 +-2
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50"
      >
        이전
      </button>
      
      {pages.map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === currentPage || page === '...'}
          className={`px-3 py-1 rounded border ${
            page === currentPage
              ? 'bg-blue-500 text-white'
              : 'hover:bg-gray-100'
          } ${page === '...' ? 'cursor-default' : ''}`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50"
      >
        다음
      </button>
    </div>
  )
} 