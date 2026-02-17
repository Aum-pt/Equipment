// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ แนบ token อัตโนมัติทุก request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ================= Dashboard =================
export const getDashboardStats = () => API.get('/dashboard');


// ================= Equipment =================
export const getEquipment = () => API.get('/equipment');
export const addEquipment = (data) => API.post('/equipment', data);
export const deleteEquipment = (id) => API.delete(`/equipment/${id}`);
export const updateEquipment = (id, data) => API.put(`/equipment/${id}`, data);
// ถ้า backend ใช้ /equipment/add → เปลี่ยนเป็น '/equipment/add'

// ================= Borrow =================
export const getBorrowList = () => API.get('/borrow');
export const borrowEquipment = (data) => API.post('/borrow/borrow', data);
export const getActiveBorrows = () => API.get('/borrow/active');
export const returnBorrow = (borrowId, data) => API.post(`/borrow/return/${borrowId}`, data);

// ================= Repair =================
export const getRepairs = () => API.get('/repair');
export const completeRepair = (id) => API.put(`/repair/${id}/complete`);

// ================= History =================
export const getActivityLogs = () => API.get('/activity');


// ================= Report =================
export const getMonthlyReport = (month, year) =>
  API.get('/report/monthly', { params: { month, year } });

export default API;
