const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const auth = require('../middleware/authMiddleware');

// CRUD อุปกรณ์ (ล็อกอินก่อนทั้งหมด)
router.post('/', auth, equipmentController.addEquipment);
router.get('/', auth, equipmentController.getAllEquipment);
router.put('/:id', auth, equipmentController.updateEquipment);
router.delete('/:id', auth, equipmentController.deleteEquipment);

module.exports = router;
