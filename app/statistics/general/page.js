'use client';

import React, { useEffect, useState } from 'react';

// 요약 카드 컴포넌트
function SummaryCard({ title, value, unit }) {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: 12,
      padding: 24,
      minWidth: 180,
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8,
    }}>
      <div style={{ fontSize: 15, color: '#888' }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: '#222' }}>{value} {unit}</div>
    </div>
  );
}

// 재고 상태별 색상
const stockColors = {
  enough: '#4caf50', // green
  low: '#ff9800',   // orange
  none: '#f44336',  // red
};

export default function StatisticsDashboard() {
  const [profitByChannel, setProfitByChannel] = useState([]);
  const [stockStatus, setStockStatus] = useState({ enough: 0, low: 0, none: 0 });
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProfit: 0,
    fulfilledOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [selectedStockType, setSelectedStockType] = useState(null);
  const [filteredStock, setFilteredStock] = useState([]);

  // 판매채널별 이익 데이터 불러오기
  useEffect(() => {
    async function fetchProfitByChannel() {
      const res = await fetch('/api/analysis/orders?limit=1000');
      const json = await res.json();
      if (json.data) {
        const channelMap = {};
        let totalSales = 0, totalProfit = 0, totalOrders = 0, fulfilledOrders = 0;
        json.data.forEach(order => {
          const channel = order.sales_site || '기타';
          if (!channelMap[channel]) channelMap[channel] = { sales: 0, profit: 0, count: 0 };
          channelMap[channel].sales += order.sales_price || 0;
          channelMap[channel].profit += order.profit || 0;
          channelMap[channel].count += 1;
          totalSales += order.sales_price || 0;
          totalProfit += order.profit || 0;
          totalOrders += 1;
          if (order.status === 'delivered') fulfilledOrders += 1;
        });
        setProfitByChannel(Object.entries(channelMap).map(([channel, v]) => ({
          channel, ...v
        })));
        setSummary(s => ({
          ...s,
          totalSales,
          totalProfit,
          totalOrders,
          fulfilledOrders,
        }));
      }
    }
    fetchProfitByChannel();
  }, []);

  // 재고 상태 데이터 불러오기
  useEffect(() => {
    async function fetchStockStatus() {
      const res = await fetch('/api/inventory/all?pageSize=1000');
      const json = await res.json();
      if (json.items) {
        let enough = 0, low = 0, none = 0;
        json.items.forEach(item => {
          const stocks = [item.nz_stock, item.aus_stock];
          stocks.forEach(stock => {
            if (stock === 0) none += 1;
            else if (stock <= 10) low += 1;
            else if (stock > 10) enough += 1;
          });
        });
        setStockStatus({ enough, low, none });
        setInventory(json.items);
      }
      setLoading(false);
    }
    fetchStockStatus();
  }, []);

  // 재고 상태 클릭 시 해당 상품 목록 필터링
  const handleStockClick = (type) => {
    setSelectedStockType(type);
    if (!type) {
      setFilteredStock([]);
      return;
    }
    // NZ/AUS 각각 체크, 둘 중 하나라도 해당 상태면 포함
    const filtered = inventory.filter(item => {
      const stocks = [item.nz_stock, item.aus_stock];
      if (type === 'none') return stocks.some(stock => stock === 0);
      if (type === 'low') return stocks.some(stock => stock > 0 && stock <= 10);
      if (type === 'enough') return stocks.some(stock => stock > 10);
      return false;
    });
    setFilteredStock(filtered);
  };

  // 모달 스타일
  const modalStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  };
  const modalContentStyle = {
    background: '#fff',
    borderRadius: 12,
    padding: 32,
    minWidth: 400,
    maxHeight: '70vh',
    overflowY: 'auto',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
  };

  if (loading) return <div style={{padding: 40, fontSize: 20}}>Loading...</div>;

  return (
    <div style={{ padding: 40, background: '#f5f6fa', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32, color: '#222' }}>통계 대시보드</h1>
      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
        <SummaryCard title="총 매출" value={summary.totalSales.toLocaleString()} unit="원" />
        <SummaryCard title="총 이익" value={summary.totalProfit.toLocaleString()} unit="원" />
        <SummaryCard title="주문수" value={summary.totalOrders} />
        <SummaryCard title="배송완료" value={summary.fulfilledOrders} />
      </div>

      {/* 판매채널별 이익 */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>판매채널별 이익</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <thead>
              <tr style={{ background: '#f0f1f5', color: '#333' }}>
                <th style={{ padding: 12, fontWeight: 600 }}>채널</th>
                <th style={{ padding: 12, fontWeight: 600 }}>매출</th>
                <th style={{ padding: 12, fontWeight: 600 }}>이익</th>
                <th style={{ padding: 12, fontWeight: 600 }}>주문수</th>
              </tr>
            </thead>
            <tbody>
              {profitByChannel.map((row, i) => (
                <tr key={i} style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{row.channel}</td>
                  <td style={{ padding: 10 }}>{row.sales.toLocaleString()}원</td>
                  <td style={{ padding: 10 }}>{row.profit.toLocaleString()}원</td>
                  <td style={{ padding: 10 }}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 재고 상태 통계 */}
      <section>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>재고 상태</h2>
        <div style={{ display: 'flex', gap: 32, marginBottom: 8 }}>
          {['enough', 'low', 'none'].map(type => (
            <div
              key={type}
              onClick={() => handleStockClick(type)}
              style={{
                cursor: 'pointer',
                background: '#fff',
                border: `2px solid ${stockColors[type]}`,
                borderRadius: 10,
                padding: '24px 36px',
                minWidth: 180,
                boxShadow: selectedStockType === type ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s',
                color: stockColors[type],
                fontWeight: 700,
                fontSize: 20,
                outline: selectedStockType === type ? `2px solid ${stockColors[type]}` : 'none',
                position: 'relative',
              }}
            >
              {type === 'enough' && '재고 충분'}
              {type === 'low' && '재고 부족'}
              {type === 'none' && '재고 없음'}
              <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{stockStatus[type]}</div>
            </div>
          ))}
        </div>
        <div style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
          (카드를 클릭하면 해당 상품 목록을 볼 수 있습니다)
        </div>
      </section>

      {/* 재고 상태별 상품 목록 모달 */}
      {selectedStockType && (
        <div style={modalStyle} onClick={() => { setSelectedStockType(null); setFilteredStock([]); }}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: stockColors[selectedStockType], margin: 0 }}>
                {selectedStockType === 'enough' && '재고 충분 상품'}
                {selectedStockType === 'low' && '재고 부족 상품'}
                {selectedStockType === 'none' && '재고 없음 상품'}
              </h3>
              <button onClick={() => { setSelectedStockType(null); setFilteredStock([]); }} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ background: '#f7f7fa' }}>
                    <th style={{ padding: 8, fontWeight: 600 }}>상품코드</th>
                    <th style={{ padding: 8, fontWeight: 600 }}>상품명</th>
                    <th style={{ padding: 8, fontWeight: 600 }}>NZ 재고</th>
                    <th style={{ padding: 8, fontWeight: 600 }}>AUS 재고</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 모달 열릴 때마다 필터링
                    const filtered = inventory.filter(item => {
                      const stocks = [item.nz_stock, item.aus_stock];
                      if (selectedStockType === 'none') return stocks.some(stock => stock === 0);
                      if (selectedStockType === 'low') return stocks.some(stock => stock > 0 && stock <= 10);
                      if (selectedStockType === 'enough') return stocks.some(stock => stock > 10);
                      return false;
                    });
                    if (filtered.length === 0) {
                      return <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>해당 상품이 없습니다.</td></tr>;
                    }
                    return filtered.map((item, idx) => (
                      <tr key={item.product_code + idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 8 }}>{item.product_code}</td>
                        <td style={{ padding: 8 }}>{item.product_name}</td>
                        <td style={{ padding: 8, color: item.nz_stock === 0 ? stockColors.none : item.nz_stock <= 10 ? stockColors.low : stockColors.enough, fontWeight: 600 }}>{item.nz_stock}</td>
                        <td style={{ padding: 8, color: item.aus_stock === 0 ? stockColors.none : item.aus_stock <= 10 ? stockColors.low : stockColors.enough, fontWeight: 600 }}>{item.aus_stock}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
