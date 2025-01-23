const { getDB } = require('../app/lib/db')

function up() {
  const db = getDB()
  
  // shipments 테이블 생성
  db.prepare(`
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_no TEXT NOT NULL UNIQUE,
      reference_no TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      shipping_from TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  // 인덱스 생성
  db.prepare('CREATE INDEX IF NOT EXISTS idx_shipments_reference_no ON shipments(reference_no)').run()
  db.prepare('CREATE INDEX IF NOT EXISTS idx_shipments_shipment_no ON shipments(shipment_no)').run()
  db.prepare('CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status)').run()
}

function down() {
  const db = getDB()
  
  // 인덱스 삭제
  db.prepare('DROP INDEX IF EXISTS idx_shipments_reference_no').run()
  db.prepare('DROP INDEX IF EXISTS idx_shipments_shipment_no').run()
  db.prepare('DROP INDEX IF EXISTS idx_shipments_status').run()
  
  // 테이블 삭제
  db.prepare('DROP TABLE IF EXISTS shipments').run()
}

module.exports = {
  up,
  down
} 