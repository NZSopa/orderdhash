-- 출품 정보 테이블 생성
CREATE TABLE IF NOT EXISTS sales_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_code TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  set_qty INTEGER DEFAULT 1,
  product_code TEXT,
  sales_price INTEGER DEFAULT 0,
  weight REAL DEFAULT 0,
  sales_site TEXT,
  site_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기존 데이터 복사
INSERT OR IGNORE INTO sales_listings (
  sales_code,
  product_name,
  set_qty,
  product_code,
  sales_price,
  weight,
  sales_site,
  site_url,
  created_at,
  updated_at
)
SELECT
  sales_code,
  product_name,
  set_qty,
  product_code,
  sales_price,
  weight,
  sales_site,
  site_url,
  created_at,
  updated_at
FROM product_codes; 