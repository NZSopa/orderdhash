## orders
CREATE TABLE orders (
 id INTEGER PRIMARY KEY,
 order_date DATE,
 reference_no TEXT,
 sku TEXT,
 product_code TEXT,
 product_name TEXT,
 original_product_name TEXT,
 consignee_name TEXT,
 kana TEXT,
 postal_code TEXT,
 address TEXT,
 phone_number TEXT,
 sales_price INTEGER,
 shipment_location TEXT,
 set_qty INTEGER DEFAULT 1,
 quantity INTEGER,
 weight REAL,
 unit_value INTEGER,
 shipment_no TEXT,
 shipment_batch TEXT,
 tracking_number TEXT,
 sales_site TEXT,
 site_url TEXT,
 status TEXT DEFAULT 'ordered' CHECK(status IN ('ordered', 'preparing', 'dispatched', 'partially_shipped','delivered', 'canceled')),
 memo TEXT,
 created_at TEXT,
 updated_at TEXT,
 shipment_at TEXT DEFAULT NULL
);

#sales_listings
CREATE TABLE IF NOT EXISTS "sales_listings" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sales_code TEXT UNIQUE NOT NULL,
        sales_sku TEXT,
        product_name TEXT NOT NULL,
        sales_product_name TEXT,
        set_qty INTEGER DEFAULT 1,
        sales_qty INTEGER DEFAULT 0,
        product_code TEXT,
        sales_price INTEGER DEFAULT 0,
        weight REAL DEFAULT 0,
        sales_site TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        site_url TEXT,
        shipping_country TEXT CHECK(shipping_country IN ('aus', 'nz')) DEFAULT NULL,
        status TEXT CHECK(status IN ('active', 'draft')) DEFAULT 'draft'
        );    

# inventory
CREATE TABLE inventory (
        product_code TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        nz_stock INTEGER DEFAULT 0,
        aus_stock INTEGER DEFAULT 0,
        memo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

# product_master
CREATE TABLE product_master (
        product_code TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        brand TEXT,
        supplier TEXT,
        image_url TEXT,
        description TEXT,
        barcode TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, shipping_from TEXT,
        CHECK (product_code <> '')
      );


# sales_sites
CREATE TABLE sales_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , site_url TEXT);

# order_summary
CREATE TABLE order_summary (
    id INTEGER PRIMARY KEY,
    order_date DATE NOT NULL,
    shipment_number TEXT,
    customer_name TEXT,
    product_code TEXT,
    product_original_name TEXT,
    product_name TEXT,
    quantity INTEGER,
    weight REAL,
    sales_site TEXT,
    settlement_type TEXT,
    order_id TEXT,
    sales_price REAL,
    amazon_fee REAL,
    yahoo_fee REAL,
    japan_company_fee REAL,
    deposit_amount_jpy REAL,
    deposit_amount_nzd REAL,
    exchange_rate REAL,
    purchase_cost REAL,
    shipping_fee REAL,
    profit REAL,
    cost_basis_month DATE,
    settlement_month DATE,
    status TEXT CHECK(status IN ('split', 'combined','dispatched', 'canceled')),
    memo TEXT,
    upload_id TEXT
, shipment_location TEXT, shipment_at TEXT);

# product_unit_prices
CREATE TABLE product_unit_prices (
        product_code TEXT,
        year_month TEXT,
        price REAL NOT NULL CHECK (price >= 0),
        memo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (product_code, year_month),
        FOREIGN KEY (product_code) REFERENCES product_master(product_code) ON DELETE CASCADE,
        CHECK (year_month LIKE '____-__')
      );
CREATE UNIQUE INDEX idx_unitprice_code_month ON product_unit_prices(product_code, year_month);

# shipment
CREATE TABLE shipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_no TEXT,
    shipment_location TEXT,
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
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reference_no TEXT,
    product_code TEXT,
    sales_site TEXT,
    sales_url TEXT,
    phone_number TEXT,
    shipment_at TEXT DEFAULT NULL, set_qty INTEGER, weight FLOAT, memo TEXT);

    # file_uploads
    CREATE TABLE file_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        status TEXT NOT NULL,
        processed_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );