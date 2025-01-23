const { withDB } = require('../app/lib/db')

async function up() {
  return withDB(async (db) => {
    // shipment 테이블 생성
    db.prepare(`
      CREATE TABLE IF NOT EXISTS shipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shipment_no TEXT,
        shipment_location TEXT CHECK(shipment_location IN ('aus', 'nz')),
        order_id TEXT,
        status TEXT DEFAULT 'processing' CHECK(status IN ('processing', 'shipped')),
        tracking_number TEXT,
        sku TEXT,
        product_name TEXT,
        quantity INTEGER,
        unit_value INTEGER,
        consignee_name TEXT,
        kana TEXT,
        postal_code TEXT,
        address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run()

    // 인덱스 생성
    db.prepare('CREATE INDEX IF NOT EXISTS idx_shipment_order_id ON shipment(order_id)').run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_shipment_status ON shipment(status)').run()
    db.prepare('CREATE INDEX IF NOT EXISTS idx_shipment_shipment_no ON shipment(shipment_no)').run()
  })
}

async function down() {
  return withDB(async (db) => {
    // 인덱스 삭제
    db.prepare('DROP INDEX IF EXISTS idx_shipment_order_id').run()
    db.prepare('DROP INDEX IF EXISTS idx_shipment_status').run()
    db.prepare('DROP INDEX IF EXISTS idx_shipment_shipment_no').run()
    
    // 테이블 삭제
    db.prepare('DROP TABLE IF EXISTS shipment').run()
  })
}

module.exports = {
  up,
  down
} 