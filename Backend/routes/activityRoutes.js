const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');

/* GET LOGS ONLY */
router.get('/', async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const result = await ActivityLog.deleteMany({});

    res.json({
      message: 'ลบประวัติทั้งหมดแล้ว',
      deletedCount: result.deletedCount
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
