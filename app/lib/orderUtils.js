/**
 * 주문의 출고지를 수정하는 함수
 * @param {string} reference_no - 주문번호
 * @param {string} newLocation - 새로운 출고지 (예: 'aus_kn', 'nz_bis')
 * @param {Array} [group] - 합배송 그룹 (선택적)
 * @param {Function} [onSuccess] - 성공 시 콜백 함수
 * @param {Function} [onError] - 에러 발생 시 콜백 함수
 * @returns {Promise<void>}
 */

const API_ENDPOINT = '/api/orders'
const SHIPMENT_ENDPOINT = '/api/shipment'

// 주문 출고지 수정 함수
async function updateOrder(id, newLocation) {
    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, shipment_location: newLocation })
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    return result
  }

export async function updateOrderLocation({
  id,
  reference_no,
  newLocation,
  group,
  onSuccess,
  onError
}) {
  try {
    // 합배송된 주문인 경우
    if (group && group.length > 1) {
      const promises = group.map(order => 
        updateOrder(order.id, newLocation)
      )

      await Promise.all(promises)
      onSuccess?.('합배송 주문의 출고지가 모두 수정되었습니다.')
    } else {
      // 단일 주문인 경우
      await updateOrder(id, newLocation)

      onSuccess?.('출고지가 수정되었습니다.')
    }
  } catch (error) {
    console.error('Error updating location:', error)
    onError?.(error.message || '출고지 수정 중 오류가 발생했습니다.')
    throw error
  }
}

/**
 * 주문 목록의 출고지를 일괄 수정하는 함수
 * @param {Array} orders - 주문 목록
 * @param {string} newLocation - 새로운 출고지
 * @param {Function} [onSuccess] - 성공 시 콜백 함수
 * @param {Function} [onError] - 에러 발생 시 콜백 함수
 * @returns {Promise<void>}
 */
export async function bulkUpdateOrderLocations({
  orders,
  newLocation,
  onSuccess,
  onError
}) {
  try {
    const promises = orders.map(order => 
      updateOrder(order.reference_no, newLocation)
    )

    await Promise.all(promises)
    onSuccess?.(`${orders.length}건의 주문 출고지가 수정되었습니다.`)
  } catch (error) {
    console.error('Error bulk updating locations:', error)
    onError?.(error.message || '출고지 일괄 수정 중 오류가 발생했습니다.')
    throw error
  }
}

/**
 * 분할 배송 처리 함수
 * @param {Object} params - 파라미터 객체
 * @param {Array} params.orders - 전체 주문 목록
 * @param {Array} params.selectedOrders - 선택된 주문 ID 목록
 * @param {Object} params.quantities - 분할할 수량 정보
 * @param {Function} [params.onSuccess] - 성공 시 콜백 함수
 * @param {Function} [params.onError] - 에러 발생 시 콜백 함수
 * @returns {Promise<void>}
 */
export async function processSplitShipment({
  orders,
  selectedOrders,
  quantities,
  onSuccess,
  onError
}) {
  try {
    const batchId = new Date().getTime().toString()
    const selectedOrderData = orders
      .filter(order => selectedOrders.includes(order.id))
      .map(order => ({
        ...order,
        quantity: quantities[order.id] || order.quantity,
        shipment_batch: batchId,
        original_batch: order.shipment_batch,
        remaining_quantity: order.quantity - (quantities[order.id] || order.quantity)
      }))

    const response = await fetch(`${SHIPMENT_ENDPOINT}/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedOrderData)
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error)

    onSuccess?.('분할 배송 처리가 완료되었습니다.')
  } catch (error) {
    console.error('Error processing split shipment:', error)
    onError?.(error.message || '분할 배송 처리 중 오류가 발생했습니다.')
    throw error
  }
}

/**
 * 합배송 처리 전 유효성 검사 함수
 * @param {Array} orders - 전체 주문 목록
 * @param {Array} selectedOrderIds - 선택된 주문 ID 목록
 * @returns {boolean} 유효성 검사 결과
 */
export function validateMergeSelection(orders, selectedOrderIds) {
  const selectedOrders = selectedOrderIds.map(id => orders.find(o => o.id === id))
  return !selectedOrders.some(order => order.shipment_batch !== null)
}

/**
 * 합배송 처리 함수
 * @param {Object} params - 파라미터 객체
 * @param {Array} params.orders - 전체 주문 목록
 * @param {Array} params.selectedOrders - 선택된 주문 ID 목록
 * @param {Function} [params.onSuccess] - 성공 시 콜백 함수
 * @param {Function} [params.onError] - 에러 발생 시 콜백 함수
 * @returns {Promise<void>}
 */
export async function processMergeShipment({
  orders,
  selectedOrders,
  onSuccess,
  onError
}) {
  try {
    const batchId = new Date().getTime().toString()
    const selectedOrderData = orders
      .filter(order => selectedOrders.includes(order.id))
      .map(order => ({
        ...order,
        shipment_batch: batchId
      }))

    const response = await fetch(`${SHIPMENT_ENDPOINT}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedOrderData)
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error)

    onSuccess?.('합배송 처리가 완료되었습니다.')
  } catch (error) {
    console.error('Error processing merge shipment:', error)
    onError?.(error.message || '합배송 처리 중 오류가 발생했습니다.')
    throw error
  }
}

/**
 * 합배송 취소 처리 함수
 * @param {Object} params - 파라미터 객체
 * @param {Array} params.orders - 취소할 주문 목록
 * @param {Function} [params.onSuccess] - 성공 시 콜백 함수
 * @param {Function} [params.onError] - 에러 발생 시 콜백 함수
 * @returns {Promise<void>}
 */
export async function cancelMergeShipment({
  orders,
  onSuccess,
  onError
}) {
  try {
    const response = await fetch(`${SHIPMENT_ENDPOINT}/merge/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orders)
    })

    const result = await response.json()
    if (!response.ok) throw new Error(result.error)

    onSuccess?.('합배송이 취소되었습니다.')
  } catch (error) {
    console.error('Error canceling merge shipment:', error)
    onError?.(error.message || '합배송 취소 중 오류가 발생했습니다.')
    throw error
  }
} 