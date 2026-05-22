import { formatCurrency } from "../../domain/entities.js";

export function historyPage({ transactions }) {
  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">ประวัติการสั่งซื้อ</p>
        <h1>เมนูที่เคยสั่ง</h1>
        <p>ดูร้านอาหาร เมนู วิธีชำระเงิน และที่อยู่จัดส่งย้อนหลังจากบัญชีของคุณ</p>
      </div>
    </section>

    <section class="data-panel">
      <div class="history-list">
        ${transactions.length ? transactions.map((transaction) => `
          <article class="history-card">
            <div class="history-card-head">
              <div>
                <p class="eyebrow">คำสั่งซื้อ #${transaction.id}</p>
                <h2>${transaction.merchantName}</h2>
                <small>${transaction.createdAt} · ${transaction.paymentMethod}</small>
              </div>
              <strong>${formatCurrency(transaction.totalAmount)}</strong>
            </div>
            <div class="history-items">
              ${transaction.items.map((item) => `
                <div>
                  <span>${item.menuName}</span>
                  <small>${formatCurrency(item.unitPrice)} x ${item.quantity}</small>
                </div>
              `).join("")}
              <div>
                <span>ค่าจัดส่ง</span>
                <small>${formatCurrency(transaction.deliveryFee)}</small>
              </div>
              <div class="history-total-line">
                <span>รวมทั้งหมด</span>
                <small>${formatCurrency(transaction.totalAmount)}</small>
              </div>
            </div>
            <div class="history-address">
              <span>จัดส่งที่</span>
              <strong>${transaction.deliveryAddress || "ไม่ได้ระบุที่อยู่"}</strong>
              <small>${transaction.deliveryLatitude ?? "-"}, ${transaction.deliveryLongitude ?? "-"}</small>
            </div>
          </article>
        `).join("") : `<p class="empty-state">ยังไม่มีประวัติการสั่งซื้อ</p>`}
      </div>
    </section>
  `;
}
