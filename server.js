require('dotenv').config();          

const express = require('express');  
const mongoose = require('mongoose');
const cors = require('cors');

// Routes
const activityRoutes = require('./Backend/routes/activityRoutes');
const equipmentRoutes = require('./Backend/routes/equipmentRoutes');
const borrowRoutes = require('./Backend/routes/borrowRoutes');
const repairRoutes = require('./Backend/routes/repairRoutes');
const reportRoutes = require('./Backend/routes/reportRoutes');
const authRoutes = require('./Backend/routes/authRoutes');
const app = express();

// Middleware
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    console.log('📊 Database:', mongoose.connection.name);
  })
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message);
  });

// Routes
app.use(express.json());   
app.use('/api/equipment', equipmentRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/auth', authRoutes);

const path = require('path');
// Serve frontend
app.use(express.static(path.join(__dirname, 'public'))); // หรือโฟลเดอร์ frontend ของคุณ

// ✅ แบบใหม่ สำหรับ Express 5
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
