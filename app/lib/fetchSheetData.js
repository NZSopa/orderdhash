import { google } from 'googleapis';
import path from 'path';

export async function fetchStockData() {
  // 인증 설정
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'lib/stocknprice-651f42e5eff4.json'), // JSON 키 파일 경로
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 구글 시트 정보 입력
  const spreadsheetId = '1OJ-jGFoH9tbpp1pR5IZu1EoL5ZaXFzSp9mbSDeSfDwY'; // 시트 URL에서 확인
  const range = 'OrderDash_Stock!A1:D'; // 원하는 범위

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    return [];
  }

  // 헤더 기준으로 객체 배열 만들기
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? null;
    });
    return obj;
  });

  return data;
}

export async function fetchPriceData() {
  // 인증 설정
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'lib/stocknprice-651f42e5eff4.json'), // JSON 키 파일 경로
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 구글 시트 정보 입력
  const spreadsheetId = '1OJ-jGFoH9tbpp1pR5IZu1EoL5ZaXFzSp9mbSDeSfDwY'; // 시트 URL에서 확인
  const range = 'OrderDash_Price!A1:X'; // 원하는 범위

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    return [];
  }

  // 헤더 기준으로 객체 배열 만들기
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? null;
    });
    return obj;
  });

  return data;
}
