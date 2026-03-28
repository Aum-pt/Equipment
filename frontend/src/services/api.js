// src/services/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {

    const status = error.response?.status;
    const url = error.config?.url || '';

    if (url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (status === 401) {
      localStorage.removeItem('token');
    }

    return Promise.reject(error);
  }
);

// ================= Dashboard =================
export const getDashboardStats = () => API.get("/dashboard");

// ================= Equipment =================
export const getEquipment = () => API.get("/equipment");
export const addEquipment = (data) => API.post("/equipment", data);
export const deleteEquipment = (id) => API.delete(`/equipment/${id}`);
export const updateEquipment = (id, data) =>
  API.put(`/equipment/${id}`, data);

// ================= Borrow =================
export const getBorrowList = () => API.get("/borrow");
export const borrowEquipment = (data) => API.post("/borrow", data);
export const getActiveBorrows = () => API.get("/borrow/active");
export const returnBorrow = (borrowId, data) =>
  API.post(`/borrow/return/${borrowId}`, data);
export const deleteBorrow = (id) => API.delete(`/borrow/${id}`);

// ================= Repair =================
export const getRepairs = () => API.get("/repair");
export const completeRepair = (id) =>
  API.put(`/repair/${id}/complete`);

// ================= History =================
export const getActivityLogs = () => API.get("/activity");

// ================= Report =================
export const getStockSummary = () =>
  API.get("/report/stock-summary");

export const getUsageReport = (from, to) =>
  API.get("/report/usage", { params: { from, to } });

export const getRepairReport = (from, to) =>
  API.get("/report/repair", { params: { from, to } });

// ================= Delete =================
export const deleteCompletedRepairs = () =>
  API.delete("/repair/completed");
export const deleteAllLogs = () =>
  API.delete("/activity");

export default API;
