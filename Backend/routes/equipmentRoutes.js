const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, equipmentController.addEquipment);
router.get('/', auth, equipmentController.getAllEquipment);
router.put('/:id', auth, equipmentController.updateEquipment);
router.delete('/:id', auth, equipmentController.deleteEquipment);
router.patch('/:id/stock', auth, equipmentController.increaseStock);
module.exports = router;
