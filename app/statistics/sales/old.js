import React, { useState, useEffect } from 'react';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const SalesDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    months: [],
    monthlySales: [],
    topProducts: [],
    monthlyProductSales: {}
  });
  const [activeTab, setActiveTab] = useState('monthlySales');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 엑셀 파일 읽기
        const response = await window.fs.readFile('Sales_Report.xlsx');
        const workbook = XLSX.read(response, { type: 'array', cellDates: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 엑셀 데이터를 JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 주문번호 분석을 통한 데이터 처리
        const monthlyData = {};
        const productData = {};

        // 전체 데이터 처리
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 6) continue;
          
          const orderNum = row[1]; // 주문번호
          const productCode = row[3]; // 제품코드
          const productName = row[4]; // 제품명
          const quantity = row[5]; // 수량
          
          // 주문번호에서 날짜 추출
          if (typeof orderNum === 'string' && orderNum.startsWith('HS')) {
            try {
              const year = '20' + orderNum.substring(2, 4);
              const month = orderNum.substring(4, 6);
              
              // 유효한 월인지 확인 (01-12)
              if (parseInt(month) < 1 || parseInt(month) > 12) continue;
              
              const yearMonth = `${year}-${month}`;
              
              // 월별 데이터 집계
              if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                  totalQuantity: 0,
                  products: {}
                };
              }
              
              monthlyData[yearMonth].totalQuantity += quantity;
              
              // 월별 제품별 데이터 집계
              const productKey = `${productCode}_${productName}`;
              if (!monthlyData[yearMonth].products[productKey]) {
                monthlyData[yearMonth].products[productKey] = {
                  code: productCode,
                  name: productName,
                  quantity: 0
                };
              }
              
              monthlyData[yearMonth].products[productKey].quantity += quantity;
              
              // 제품별 총 판매량 집계
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
              console.error('주문번호 처리 오류:', e);
            }
          }
        }

        // 결과 정리
        const sortedMonths = Object.keys(monthlyData)
          .filter(month => month.startsWith('20')) // 유효한 연도만 (20으로 시작하는 연도)
          .sort();

        // 상위 5개 제품
        const topProducts = Object.values(productData)
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
          .slice(0, 5);

        const monthlyProductSales = {};
        
        // 상위 5개 제품의 월별 판매량
        topProducts.forEach(product => {
          const productKey = `${product.code}_${product.name}`;
          monthlyProductSales[product.name] = sortedMonths.map(month => ({
            month,
            sales: productData[productKey].monthlyData[month] || 0
          }));
        });

        // 차트 데이터 설정
        const chartData = {
          months: sortedMonths,
          monthlySales: sortedMonths.map(month => ({
            month,
            sales: monthlyData[month].totalQuantity,
            name: convertMonthFormat(month) // 표시용 월 형식 변환
          })),
          topProducts: topProducts.map(product => ({
            name: formatProductName(product.name), // 긴 제품명 포맷팅
            fullName: product.name,
            sales: product.totalQuantity
          })),
          monthlyProductSales
        };

        setData(chartData);
        setLoading(false);
      } catch (err) {
        console.error('데이터 로딩 오류:', err);
        setError('데이터를 로드하는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 월 형식 변환 (2024-06 -> 2024년 6월)
  const convertMonthFormat = (monthStr) => {
    try {
      const [year, month] = monthStr.split('-');
      return `${year}년 ${parseInt(month)}월`;
    } catch (e) {
      return monthStr;
    }
  };

  // 제품명 포맷팅 (너무 긴 경우 축약)
  const formatProductName = (name) => {
    if (!name) return '';
    if (name.length <= 20) return name;
    
    // "MANUKA HEALTH MANUKA HONEY MGO 115+ 500G" -> "MANUKA ... MGO 115+ 500G"
    const parts = name.split(' ');
    if (parts.length <= 3) return name;
    
    return `${parts[0]} ... ${parts.slice(-3).join(' ')}`;
  };

  // 활성 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // 로딩 중 표시
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-2xl font-bold text-blue-600 mb-4">데이터 로딩 중...</div>
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 오류 표시
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-2xl font-bold text-red-600 mb-4">오류 발생</div>
        <div className="text-lg text-gray-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-blue-600 p-6 shadow-md">
        <h1 className="text-3xl font-bold text-white">월별 제품 판매 실적 대시보드</h1>
        <p className="text-blue-100 mt-2">2024년 6월 ~ 2025년 5월 판매 데이터 분석</p>
      </header>
      
      {/* 탭 메뉴 */}
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
      
      {/* 대시보드 컨텐츠 */}
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
            
            {/* 월별 판매량 테이블 */}
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
            
            {/* 제품별 정보 */}
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
              
              {/* 제품별 판매량 테이블 */}
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
      
      {/* 푸터 */}
      <footer className="bg-gray-100 p-4 text-center text-gray-600 text-sm">
        © 2025 판매 실적 대시보드. 데이터 기준: Sales_Report.xlsx
      </footer>
    </div>
  );
};

export default SalesDashboard;