# Equipment Management System

ระบบบริหารจัดการอุปกรณ์ภายในองค์กร ครอบคลุมตั้งแต่การบันทึกอุปกรณ์เข้าคลัง การเบิก-คืน การซ่อม ไปจนถึงการออกรายงาน

---

## Tech Stack

| ฝั่ง | เทคโนโลยี |
|------|-----------|
| Frontend | React, React Router, Recharts, ExcelJS |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT (jsonwebtoken) |

---

## การติดตั้ง

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/Aum-pt/Equipment.git
cd Equipment
```

### 2. ติดตั้ง Dependencies

```bash
# Backend
npm install

# Frontend
cd client
npm install
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์

```env
MONGO_URI=mongodb://localhost:27017/equipment-db
JWT_SECRET=your_jwt_secret_key
PORT=5000
LOW_STOCK=5
```

### 4. รันระบบ

```bash
# รัน Backend
node server.js

# รัน Frontend (อีก terminal)
cd frontend 
npm start
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

---

## โครงสร้างโปรเจกต์

```
equipment-management-system/
├── Backend/
│   ├── controllers/
│   │   ├── borrowController.js
│   │   ├── dashboardController.js
│   │   ├── equipmentController.js
│   │   ├── repairController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── ActivityLog.js
│   │   ├── Borrow.js
│   │   ├── Equipment.js
│   │   └── Repair.js
│   └── routes/
│       ├── activityRoutes.js
│       ├── authRoutes.js
│       ├── borrowRoutes.js
│       ├── dashboardRoutes.js
│       ├── equipmentRoutes.js
│       ├── repairRoutes.js
│       └── reportRoutes.js
├── client/
│   └── src/
│       ├── components/
│       │   ├── BorrowForm.js
│       │   ├── ConfirmModal.js
│       │   ├── EquipmentTable.js
│       │   ├── Navbar.js
│       │   ├── ReturnForm.js
│       │   └── Toast.js
│       ├── pages/
│       │   ├── Borrow.js
│       │   ├── Dashboard.js
│       │   ├── Equipment.js
│       │   ├── History.js
│       │   ├── Login.js
│       │   ├── Repair.js
│       │   ├── Report.js
│       │   └── Return.js
│       ├── services/
│       │   └── api.js
│       └── config/
│           └── constants.js
└── server.js
```

---

## API Endpoints

ทุก endpoint (ยกเว้น `/api/auth/login`) ต้องแนบ JWT Token ใน Header

```
Authorization: Bearer <token>
```

### Auth

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/api/auth/login` | เข้าสู่ระบบ รับ JWT Token กลับมา |

### Equipment

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/equipment` | ดึงอุปกรณ์ทั้งหมด |
| POST | `/api/equipment` | เพิ่มอุปกรณ์ใหม่ |
| PUT | `/api/equipment/:id` | แก้ไขข้อมูลอุปกรณ์ |
| DELETE | `/api/equipment/:id` | ลบอุปกรณ์ |
| PATCH | `/api/equipment/:id/stock` | เพิ่มจำนวนสต็อก |

### Borrow

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/borrow` | ดึงใบยืมทั้งหมด |
| GET | `/api/borrow/active` | ดึงใบยืมที่ยังยืมอยู่ |
| POST | `/api/borrow` | สร้างใบยืม (เบิกอุปกรณ์) |
| POST | `/api/borrow/return/:id` | คืนอุปกรณ์ |
| DELETE | `/api/borrow/:id` | ลบใบยืม |

### Repair

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/repair` | ดึงรายการซ่อมทั้งหมด |
| PUT | `/api/repair/:id/complete` | บันทึกซ่อมเสร็จ |
| DELETE | `/api/repair/completed` | ลบรายการซ่อมที่เสร็จแล้ว |

### Report & Activity

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/report` | ดึงรายงาน รองรับ query: `search`, `status`, `date` |
| GET | `/api/activity` | ดึง Activity Log ทั้งหมด |
| DELETE | `/api/activity` | ลบ Activity Log ทั้งหมด |

---

## คู่มือการใช้งาน

### เข้าสู่ระบบ

ไปที่ `http://localhost:3000/login` แล้วกรอก Username และ Password
Session มีอายุ **8 ชั่วโมง** หลังจากนั้นระบบจะ Logout อัตโนมัติ

---

### Dashboard

แสดงภาพรวมของอุปกรณ์ทั้งหมด

- **การ์ดสถิติ** — อุปกรณ์ทั้งหมด / ใกล้หมด / หมดแล้ว คลิกเพื่อ filter ในหน้าคลัง
- **กราฟ** — Top 5 อุปกรณ์ที่ใช้บ่อย และ Top 5 อุปกรณ์ที่ซ่อมบ่อย
- **รายการแจ้งเตือน** — อุปกรณ์ที่ต้องสั่งเพิ่มโดยด่วน

---

### คลังอุปกรณ์

จัดการข้อมูลอุปกรณ์ทั้งหมด

**เพิ่มอุปกรณ์**
1. กดปุ่ม **เพิ่มอุปกรณ์ใหม่**
2. กรอกรหัส ชื่อ จำนวน ประเภท และค่าแจ้งเตือน
3. กด **บันทึก** — หากรหัสซ้ำ ระบบจะรวมจำนวนเข้ากับรายการเดิมแทน

**ประเภทอุปกรณ์**

| ประเภท | ลักษณะ |
|--------|--------|
| `reusable` (ใช้ซ้ำได้) | ต้องคืนหลังใช้งาน ระบบติดตามสถานะ |
| `consumable` (ใช้แล้วหมด) | ไม่ต้องคืน ใบยืมปิดทันที |

**สถานะอุปกรณ์**

| สถานะ | เงื่อนไข |
|--------|---------|
| พร้อมใช้งาน | `available > low_stock_threshold` |
| เหลือน้อย | `0 < available <= low_stock_threshold` (reusable เท่านั้น) |
| หมดสต็อก | `available === 0` |

---

### เบิกอุปกรณ์

1. ค้นหาและติ๊กเลือกอุปกรณ์ที่ต้องการ
2. ระบุจำนวนด้วยปุ่ม +/− (ไม่เกิน available)
3. กดปุ่ม **เบิกอุปกรณ์**
4. เลือกกองงาน (`กองงาน1` / `กองงาน2` / `กองงาน3`) และประเภท (`ติดตั้ง` / `ซ่อมบำรุง`)
5. กด **ยืนยันการเบิก**

> ถ้าทุก item เป็น `consumable` → ใบยืมปิดเป็น `เสร็จสิ้น` ทันที
> ถ้ามี `reusable` อยู่ด้วย → สถานะเป็น `ยืมอยู่` รอคืน

---

### คืนอุปกรณ์

หน้านี้แสดงเฉพาะใบยืมที่มีสถานะ `ยืมอยู่`

1. เลือกใบยืมที่ต้องการคืน
2. ระบุ **จำนวนคืนปกติ** และ **จำนวนชำรุด**
3. กรอกหมายเหตุ (ถ้ามี) แล้วกด **คืนอุปกรณ์**

**เงื่อนไข**
- `returnQty + damagedQty` ต้องไม่เกินจำนวนที่ค้างอยู่
- สามารถคืนแบ่งหลายครั้งได้
- เมื่อคืนครบทุก reusable item → ใบยืมเปลี่ยนเป็น `คืนแล้ว` อัตโนมัติ
- อุปกรณ์ที่ชำรุดจะถูกส่งไปยังระบบซ่อมอัตโนมัติ

---

### ระบบซ่อมอุปกรณ์

รายการซ่อมถูกสร้างอัตโนมัติเมื่อมีการคืนอุปกรณ์ชำรุด

1. กดปุ่ม **ซ่อมเสร็จแล้ว** ในรายการที่ต้องการ
2. ระบบจะเพิ่มจำนวนอุปกรณ์กลับเข้าคลัง (`available += damagedQty`)
3. กด **ลบรายการซ่อมเสร็จ** เพื่อล้างรายการที่เสร็จแล้ว

---

### ประวัติการใช้งาน

แสดง Activity Log ทุกกิจกรรมในระบบ เรียงจากใหม่ไปเก่า

| Action | เกิดขึ้นเมื่อ |
|--------|-------------|
| `ADD_EQUIPMENT` | เพิ่มอุปกรณ์ใหม่ |
| `UPDATE_EQUIPMENT` | แก้ไขข้อมูลอุปกรณ์ |
| `DELETE_EQUIPMENT` | ลบอุปกรณ์ |
| `BORROW` | สร้างใบยืม |
| `RETURN` | คืนอุปกรณ์ |
| `REPAIR_COMPLETE` | บันทึกซ่อมเสร็จ |

---

### รายงาน

ดูข้อมูลการเบิก คืน และซ่อมทุกใบยืม

**Query Parameters สำหรับ `/api/report`**

| Parameter | ตัวอย่าง | คำอธิบาย |
|-----------|---------|----------|
| `search` | `?search=สว่าน` | กรองตามชื่ออุปกรณ์ |
| `status` | `?status=ยืมอยู่` | กรองตามสถานะ |
| `date` | `?date=2025-01-15` | กรองตามวันที่ (เบิก/คืน/ซ่อม) |

---

## Flow การทำงาน

```
เพิ่มอุปกรณ์
     │
     ▼
พร้อมใช้งาน
     │
     ▼ เบิก
ยืมอยู่
     │
     ▼ คืน
     ├─ ปกติ ──────────────────► available + returnQty
     │
     └─ ชำรุด ──► กำลังซ่อม ──► ซ่อมเสร็จ ──► available + damagedQty
                                      │
                         (ครบทุก item) ▼
                               คืนแล้ว
```

---

## License

MIT
