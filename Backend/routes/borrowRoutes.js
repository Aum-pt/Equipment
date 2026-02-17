const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrowController');
const auth = require('../middleware/authMiddleware');

// =======================
// Query
// =======================

// ใบยืมทั้งหมด
router.get('/', auth, borrowController.getAllBorrows);

// ใบที่ยังไม่คืน
router.get('/active', auth, borrowController.getActiveBorrows);

// =======================
// Actions
// =======================

// เบิกอุปกรณ์
router.post('/borrow', auth, borrowController.borrowEquipment);

// คืนอุปกรณ์
router.post('/return/:id', auth, borrowController.returnEquipment);

module.exports = router;
