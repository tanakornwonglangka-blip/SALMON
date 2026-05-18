import { Roles, formatCurrency } from "../../domain/entities.js";
import { metricCard } from "../components/layout.js";

const roleLabel = (role) => role === Roles.ADMIN ? "ผู้ดูแลระบบ" : "ร้านค้า";
const statusLabel = (status) => status === "paid" ? "ชำระแล้ว" : status === "pending" ? "รอชำระ" : "คืนเงินแล้ว";

export function portalPage({ merchants, transactions }, user) {
  const totalSales = transactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);
  const paidCount = transactions.filter((transaction) => transaction.status === "paid").length;

  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">ภาพรวมร้านค้า</p>
        <h1>ข้อมูลธุรกรรม</h1>
        <p>${user.role === Roles.ADMIN ? "ผู้ดูแลระบบเห็นข้อมูลทุกร้านค้า" : "ร้านค้าเห็นเฉพาะธุรกรรมของร้านตัวเอง"}</p>
      </div>
      <span class="role-badge">${roleLabel(user.role)}</span>
    </section>

    <section class="metrics-grid">
      ${metricCard("ยอดขายรวม", formatCurrency(totalSales), "จากธุรกรรมที่มองเห็น")}
      ${metricCard("รายการชำระแล้ว", paidCount, "ธุรกรรมสำเร็จ")}
      ${metricCard("จำนวนร้าน", merchants.length, user.role === Roles.ADMIN ? "ร้านค้าทั้งหมด" : "ร้านของคุณ")}
    </section>

    <section class="portal-grid">
      <article class="data-panel">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">ร้านค้า</p>
            <h2>ข้อมูลร้านค้า</h2>
          </div>
        </div>
        <div class="merchant-table">
          ${merchants.map((merchant) => `
            <div class="table-row">
              <strong>${merchant.name}</strong>
              <span>${merchant.category}</span>
              <span>${merchant.location}</span>
              <small>${merchant.address}</small>
              <span>${merchant.rating} ★</span>
            </div>
          `).join("")}
        </div>
      </article>

      <article class="data-panel">
        <div class="section-title inline">
          <div>
            <p class="eyebrow">ธุรกรรม</p>
            <h2>รายการล่าสุด</h2>
          </div>
        </div>
        <div class="transaction-list">
          ${transactions.map((transaction) => `
            <div class="transaction-row">
              <div>
                <strong>คำสั่งซื้อ #${transaction.id}</strong>
                <small>${transaction.customer} · ${transaction.createdAt}</small>
              </div>
              <span>${transaction.merchantName}</span>
              <span>${transaction.paymentMethod}</span>
              <strong>${formatCurrency(transaction.totalAmount)}</strong>
              <span class="status ${transaction.status}">${statusLabel(transaction.status)}</span>
              <small class="transaction-items">${transaction.items.map((item) => `${item.menuName} × ${item.quantity}`).join(", ")}</small>
            </div>
          `).join("")}
        </div>
      </article>
    </section>
  `;
}
