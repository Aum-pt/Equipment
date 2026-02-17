const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/authMiddleware');

router.get('/monthly', auth, reportController.monthlyReport);
router.get('/export', auth, reportController.exportCSV);

module.exports = router;
