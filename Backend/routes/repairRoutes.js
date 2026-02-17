const express = require('express');
const router = express.Router();
const repairController = require('../controllers/repairController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, repairController.getRepairs);
router.put('/:id/complete', auth, repairController.completeRepair);

module.exports = router;
