export function paymentResultPage(status) {
  const result = status?.result ?? "pending";
  const copy = {
    success: {
      eyebrow: "ชำระเงินสำเร็จ",
      title: "ธุรกรรมสำเร็จ",
      message: "ระบบบันทึกคำสั่งซื้อของคุณเรียบร้อยแล้ว",
      tone: "success"
    },
    failed: {
      eyebrow: "ชำระเงินไม่สำเร็จ",
      title: "ธุรกรรมไม่สำเร็จ",
      message: status?.error || "ไม่สามารถชำระเงินรายการนี้ได้ กรุณาลองใหม่อีกครั้ง",
      tone: "failed"
    },
    pending: {
      eyebrow: "กำลังตรวจสอบ",
      title: "กำลังตรวจสอบสถานะชำระเงิน",
      message: "ระบบกำลังตรวจสอบผลธุรกรรมจากผู้ให้บริการ",
      tone: "pending"
    }
  }[result] ?? {
    eyebrow: "แจ้งเตือน",
    title: "ไม่พบสถานะชำระเงิน",
    message: "ยังไม่มีข้อมูลธุรกรรมสำหรับตรวจสอบ",
    tone: "failed"
  };

  return `
    <section class="payment-result-page">
      <article class="payment-result-card ${copy.tone}">
        <p class="eyebrow">${copy.eyebrow}</p>
        <h1>${copy.title}</h1>
        <p class="muted">${copy.message}</p>
        ${status?.status ? `<div class="payment-result-status">สถานะ: <strong>${status.status}</strong></div>` : ""}
        <div class="modal-actions">
          <a class="ghost-button" href="#/history">ดูประวัติ</a>
          <a class="primary-button" href="#/user">กลับไปสั่งอาหาร</a>
        </div>
      </article>
    </section>
  `;
}
