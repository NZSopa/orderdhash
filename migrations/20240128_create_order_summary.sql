-- 주문 요약 테이블 생성
CREATE TABLE IF NOT EXISTS order_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_no TEXT NOT NULL,
  sales_site TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  sales_price REAL NOT NULL DEFAULT 0,
  order_date DATE NOT NULL,
  settlement_month TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_order_summary_reference_no ON order_summary(reference_no);
CREATE INDEX IF NOT EXISTS idx_order_summary_sales_site ON order_summary(sales_site);
CREATE INDEX IF NOT EXISTS idx_order_summary_product_code ON order_summary(product_code);
CREATE INDEX IF NOT EXISTS idx_order_summary_order_date ON order_summary(order_date);
CREATE INDEX IF NOT EXISTS idx_order_summary_settlement_month ON order_summary(settlement_month); 