export function usersPage({ users }, currentUser) {
  return `
    <section class="page-heading">
      <div>
        <p class="eyebrow">ข้อมูลผู้ใช้</p>
        <h1>${currentUser.role === "admin" ? "ผู้ใช้ทั้งหมดในระบบ" : "ข้อมูลบัญชีของฉัน"}</h1>
        <p>แสดงข้อมูลบัญชี บทบาท อีเมล และที่อยู่สำหรับจัดส่ง โดยไม่แสดงรหัสผ่านหรือ hash</p>
      </div>
      <button class="primary-button" data-action="open-register">สมัครสมาชิก</button>
    </section>

    <section class="data-panel">
      <div class="user-list">
        ${users.map((user) => `
          <article class="user-card">
            <div class="avatar">${user.firstName.slice(0, 1)}</div>
            <div>
              <strong>${user.firstName} ${user.lastName}</strong>
              <p>${user.email}</p>
              <small>ชื่อผู้ใช้: ${user.username}</small>
            </div>
            <span class="role-badge">${user.role === "admin" ? "ผู้ดูแลระบบ" : user.role === "merchant" ? "ร้านค้า" : "ผู้สั่งอาหาร"}</span>
            <div>
              <small>${user.merchantName ? `ร้าน: ${user.merchantName}` : "ไม่มีร้านที่ผูกไว้"}</small>
              <p class="address-text">${user.deliveryAddress || "ยังไม่ได้ระบุที่อยู่"}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
