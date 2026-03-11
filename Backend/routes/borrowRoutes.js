const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrowController');
const auth = require('../middleware/authMiddleware');

// ใบยืมทั้งหมด
router.get('/', auth, borrowController.getAllBorrows);
// ใบที่ยังไม่คืน
router.get('/active', auth, borrowController.getActiveBorrows);
// เบิกอุปกรณ์ - เปลี่ยนจาก '/borrow' เป็น '/'
router.post('/', auth, borrowController.borrowEquipment);
// คืนอุปกรณ์
router.post('/return/:id', auth, borrowController.returnEquipment);
// ลบใบยืม
router.delete('/:id', auth, borrowController.deleteBorrow);

module.exports = router;