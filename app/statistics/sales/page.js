'use client'

import React, { useState } from 'react';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const SAMPLE_HEADERS = [
  'No', '주문번호', '주문일자', '제품코드', '제품명', '수량', '금액'
];
const SAMPLE_DATA = [
  [1, 'HS2406XXXX', '2024-06-01', 'P001', '제품A', 3, 30000],
  [2, 'HS2406YYYY', '2024-06-02', 'P002', '제품B', 2, 20000],
  [3, 'HS2407ZZZZ', '2024-07-01', 'P001', '제품A', 1, 10000],
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function downloadSampleExcel() {
  const ws = XLSX.utils.aoa_to_sheet([SAMPLE_HEADERS, ...SAMPLE_DATA]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sales_Report_Sample.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

const SalesDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    months: [],
    monthlySales: [],
    topProducts: [],
    monthlyProductSales: {}
  });
  const [activeTab, setActiveTab] = useState('monthlySales');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const monthlyData = {};
      const productData = {};
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 6) continue;
        const orderNum = row[1];
        const productCode = row[3];
        const productName = row[4];
        const quantity = row[5];
        if (typeof orderNum === 'string' && orderNum.startsWith('HS')) {
          try {
            const year = '20' + orderNum.substring(2, 4);
            const month = orderNum.substring(4, 6);
            if (parseInt(month) < 1 || parseInt(month) > 12) continue;
            const yearMonth = `${year}-${month}`;
            if (!monthlyData[yearMonth]) {
              monthlyData[yearMonth] = {
                totalQuantity: 0,
                products: {}
              };
            }
            monthlyData[yearMonth].totalQuantity += quantity;
            const productKey = `${productCode}_${productName}`;
            if (!monthlyData[yearMonth].products[productKey]) {
              monthlyData[yearMonth].products[productKey] = {
                code: productCode,
                name: productName,
                quantity: 0
              };
            }
            monthlyData[yearMonth].products[productKey].quantity += quantity;
            if (!productData[productKey]) {
              productData[productKey] = {
                code: productCode,
                name: productName,
                totalQuantity: 0,
                monthlyData: {}
              };
            }
            productData[productKey].totalQuantity += quantity;
            if (!productData[productKey].monthlyData[yearMonth]) {
              productData[productKey].monthlyData[yearMonth] = 0;
            }
            productData[productKey].monthlyData[yearMonth] += quantity;
          } catch (e) {
            // 주문번호 처리 오류 무시
          }
        }
      }
      const sortedMonths = Object.keys(monthlyData)
        .filter(month => month.startsWith('20'))
        .sort();
      const topProducts = Object.values(productData)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);
      const monthlyProductSales = {};
      topProducts.forEach(product => {
        const productKey = `${product.code}_${product.name}`;
        monthlyProductSales[product.name] = sortedMonths.map(month => ({
          month,
          sales: productData[productKey].monthlyData[month] || 0
        }));
      });
      const chartData = {
        months: sortedMonths,
        monthlySales: sortedMonths.map(month => ({
          month,
          sales: monthlyData[month].totalQuantity,
          name: convertMonthFormat(month)
        })),
        topProducts: topProducts.map(product => ({
          name: formatProductName(product.name),
          fullName: product.name,
          sales: product.totalQuantity
        })),
        monthlyProductSales
      };
      setData(chartData);
      setLoading(false);
    } catch (err) {
      setError('엑셀 파일을 읽는 중 오류가 발생했습니다. 양식을 확인해 주세요.');
      setLoading(false);
    }
  };

  const convertMonthFormat = (monthStr) => {
    try {
      const [year, month] = monthStr.split('-');
      return `${year}년 ${parseInt(month)}월`;
    } catch (e) {
      return monthStr;
    }
  };

  const formatProductName = (name) => {
    if (!name) return '';
    if (name.length <= 20) return name;
    const parts = name.split(' ');
    if (parts.length <= 3) return name;
    return `${parts[0]} ... ${parts.slice(-3).join(' ')}`;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-blue-600 p-6 shadow-md">
        <h1 className="text-3xl font-bold text-white">월별 제품 판매 실적 대시보드</h1>
        <p className="text-blue-100 mt-2">2024년 6월 ~ 2025년 5월 판매 데이터 분석</p>
      </header>
      <div className="bg-white p-6 flex flex-col md:flex-row items-center gap-4 border-b border-gray-200">
        <div className="flex-1 flex flex-col md:flex-row items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="border rounded px-3 py-2"
          />
          {fileName && <span className="text-sm text-gray-600 ml-2">{fileName}</span>}
        </div>
        <button
          onClick={downloadSampleExcel}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          샘플 양식 다운로드
        </button>
      </div>
      {loading && (
        <div className="flex flex-col items-center justify-center flex-1 bg-gray-50 p-4">
          <div className="text-2xl font-bold text-blue-600 mb-4">데이터 로딩 중...</div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 bg-gray-50 p-4">
          <div className="text-2xl font-bold text-red-600 mb-4">오류 발생</div>
          <div className="text-lg text-gray-700">{error}</div>
        </div>
      )}
      {!loading && !error && data.monthlySales.length > 0 && (
        <>
          <div className="flex border-b border-gray-200 bg-white">
            <button 
              className={`py-3 px-6 font-medium ${activeTab === 'monthlySales' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} 
              onClick={() => handleTabChange('monthlySales')}
            >
              월별 총 판매량
            </button>
            <button 
              className={`py-3 px-6 font-medium ${activeTab === 'productSales' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} 
              onClick={() => handleTabChange('productSales')}
            >
              제품별 판매량
            </button>
            <button 
              className={`py-3 px-6 font-medium ${activeTab === 'topProducts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} 
              onClick={() => handleTabChange('topProducts')}
            >
              상위 제품 점유율
            </button>
          </div>
          <div className="flex-1 p-6">
            {activeTab === 'monthlySales' && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">월별 총 판매량</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.monthlySales}
                      margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}개`, '판매량']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        name="판매량" 
                        stroke="#0088FE" 
                        strokeWidth={3} 
                        dot={{ r: 5 }} 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-3 px-4 text-left">월</th>
                        <th className="py-3 px-4 text-left">판매량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlySales.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4">{item.name}</td>
                          <td className="py-3 px-4 font-medium">{item.sales}개</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'productSales' && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">상위 5개 제품별 월별 판매량</h2>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.monthlySales}
                      margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {data.topProducts.map((product, index) => (
                        <Bar 
                          key={index} 
                          dataKey={(entry) => {
                            const productSales = data.monthlyProductSales[product.fullName] || [];
                            const monthSale = productSales.find(item => item.month === entry.month);
                            return monthSale ? monthSale.sales : 0;
                          }}
                          name={product.name} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.topProducts.map((product, index) => (
                    <div 
                      key={index} 
                      className="p-4 border rounded-lg border-l-4"
                      style={{ borderLeftColor: COLORS[index % COLORS.length] }}
                    >
                      <h3 className="font-bold text-gray-800">{product.fullName}</h3>
                      <p className="text-2xl font-bold mt-2">{product.sales}개</p>
                      <p className="text-sm text-gray-500 mt-1">총 판매량</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'topProducts' && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">상위 5개 제품 점유율</h2>
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.topProducts}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="sales"
                        >
                          {data.topProducts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value}개`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 mt-4 md:mt-0 md:pl-4">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="py-3 px-4 text-left">제품명</th>
                          <th className="py-3 px-4 text-left">판매량</th>
                          <th className="py-3 px-4 text-left">점유율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topProducts.map((product, index) => {
                          const totalSales = data.topProducts.reduce((sum, p) => sum + p.sales, 0);
                          const percentage = (product.sales / totalSales * 100).toFixed(1);
                          return (
                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-3 px-4 flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                ></div>
                                <span className="truncate max-w-xs">{product.fullName}</span>
                              </td>
                              <td className="py-3 px-4 font-medium">{product.sales}개</td>
                              <td className="py-3 px-4">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {!loading && !error && data.monthlySales.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 bg-gray-50 p-8 text-gray-500">
          <div className="text-2xl font-bold mb-2">엑셀 파일을 업로드해 주세요</div>
          <div>샘플 양식을 다운로드 받아 양식에 맞게 파일을 준비한 후 업로드하세요.</div>
        </div>
      )}
      <footer className="bg-gray-100 p-4 text-center text-gray-600 text-sm">
        © 2025 판매 실적 대시보드. 데이터 기준: 업로드된 파일
      </footer>
    </div>
  );
};

export default SalesDashboard; 