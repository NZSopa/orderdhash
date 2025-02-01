// 날짜 형식 변환 함수
export function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // 이미 YYYY-MM-DD 형식인 경우
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    try {
      // 시간 정보가 포함된 날짜 문자열 처리 (예: '1/31/2025 2:02:35 PM')
      if (dateStr.includes(':')) {
        const date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]
        }
      }
      
      // M/D/YYYY 또는 MM/DD/YYYY 형식 처리
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        // 시간 정보가 있는 경우 제거
        const yearPart = parts[2].split(' ')[0]
        const month = parts[0].padStart(2, '0')
        const day = parts[1].padStart(2, '0')
        return `${yearPart}-${month}-${day}`
      }
      
      // 다른 형식의 경우 Date 객체로 파싱 시도
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    } catch (error) {
      console.error('Error parsing date:', dateStr, error)
    }
    
    return null
}