'use server'

import { revalidatePath } from 'next/cache'
import sqlite3 from 'better-sqlite3'
import path from 'path'

function getDB() {
  return sqlite3(path.join(process.cwd(), 'data', 'orderdash.db'))
}

export async function deleteAllCodes() {
  try {
    const db = getDB()
    db.prepare('DELETE FROM product_codes').run()
    db.close()
    revalidatePath('/codes')
    return { success: true }
  } catch (error) {
    console.error('Error deleting all codes:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteCode(salesCode) {
  try {
    const db = getDB()
    db.prepare('DELETE FROM product_codes WHERE sales_code = ?').run(salesCode)
    db.close()
    revalidatePath('/codes')
    return { success: true }
  } catch (error) {
    console.error('Error deleting code:', error)
    return { success: false, error: error.message }
  }
} 