import { allRows, type DbRow } from "../db.js";

export function transactionRow(row: DbRow) {
  const items = allRows("SELECT * FROM transaction_items WHERE transaction_id = ?", row.id).map((item) => ({
    menuItemId: Number(item.menu_item_id),
    menuName: String(item.menu_name),
    unitPrice: Number(item.unit_price),
    quantity: Number(item.quantity),
    lineTotal: Number(item.line_total)
  }));

  return {
    id: Number(row.id),
    merchantId: Number(row.merchant_id),
    merchantName: String(row.merchant_name),
    customer: String(row.customer_name),
    deliveryAddress: row.delivery_address == null ? null : String(row.delivery_address),
    deliveryLatitude: row.delivery_latitude == null ? null : Number(row.delivery_latitude),
    deliveryLongitude: row.delivery_longitude == null ? null : Number(row.delivery_longitude),
    paymentMethod: String(row.payment_method),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    totalAmount: Number(row.total_amount),
    status: String(row.status),
    createdAt: String(row.created_at),
    items
  };
}
