import Database from 'better-sqlite3'
import path from 'path'

let db = null

export function getDB() {
  if (db) {
    try {
      // 연결 상태 확인을 위한 간단한 쿼리 실행
      db.prepare('SELECT 1').get()
      return db
    } catch (error) {
      // 연결이 끊어진 경우 db 객체 초기화
      db = null
    }
  }
  
  try {
    const dbPath = path.join(process.cwd(), 'data', 'orderdash.db')
    db = new Database(dbPath, {
      verbose: console.log
    })
    
    // WAL 모드 활성화
    db.pragma('journal_mode = WAL')
    
    // 외래키 제약 활성화
    db.pragma('foreign_keys = ON')

    // 캐시 크기 최적화
    db.pragma('cache_size = -2000') // 약 2MB 캐시

    return db
  } catch (error) {
    console.error('Database connection error:', error)
    throw error
  }
}

export function closeDB() {
  if (db) {
    try {
      db.close()
    } catch (error) {
      console.error('Error closing database:', error)
    } finally {
      db = null
    }
  }
}

// 데이터베이스 작업을 위한 헬퍼 함수
export async function withDB(operation) {
  const database = getDB()
  try {
    return await operation(database)
  } finally {
    // 연결을 닫지 않고 재사용
  }
}

export function getProductNameByCode(productCode, defaultName = '') {
  try {
    const database = getDB()
    const result = database.prepare('SELECT product_name FROM product_master WHERE product_code = ?')
      .get(productCode)
    return result ? result.product_name : defaultName
  } catch (error) {
    console.error('Error getting product name:', error)
    return defaultName
  }
}

// 이벤트 리스너는 한 번만 등록
if (!process.listenerCount('exit')) {
  process.once('exit', () => {
    closeDB()
  })
}

if (!process.listenerCount('SIGINT')) {
  process.once('SIGINT', () => {
    closeDB()
    process.exit(0)
  })
}

// 기본 데이터베이스 인스턴스 export
export default getDB() 