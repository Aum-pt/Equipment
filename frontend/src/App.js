import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';  

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Borrow from './pages/Borrow';
import Return from './pages/Return';
import Repair from './pages/Repair';
import Report from './pages/Report';
import History from './pages/History';
import Navbar from './components/Navbar';

// ✅ ใช้ token จาก props (ไม่ใช้ localStorage ตรง ๆ)
function PrivateRoute({ children, token }) {
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const [token, setToken] = useState(null);  

  // โหลด token ตอนเปิดเว็บ
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) setToken(storedToken);
  }, []);

  // เช็ค token หมดอายุทุก 5 วิ
  useEffect(() => {
    const interval = setInterval(() => {
      const t = localStorage.getItem('token');
      if (!t) return;

      try {
        const decoded = jwtDecode(t);

        if (decoded.exp < Date.now() / 1000) {
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch {
        localStorage.removeItem('token');
        setToken(null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      {token && <Navbar />}

      <Routes>

        {/* ✅ กันเข้าหน้า login ถ้า login แล้ว */}
        <Route 
          path="/login" 
          element={!token ? <Login setToken={setToken} /> : <Navigate to="/" />} 
        />

        {/* ✅ ใช้ token จาก state */}
        <Route 
          path="/" 
          element={
            <PrivateRoute token={token}>
              <Dashboard />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/equipment" 
          element={
            <PrivateRoute token={token}>
              <Equipment />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/borrow" 
          element={
            <PrivateRoute token={token}>
              <Borrow />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/return" 
          element={
            <PrivateRoute token={token}>
              <Return />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/repair" 
          element={
            <PrivateRoute token={token}>
              <Repair />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/history" 
          element={
            <PrivateRoute token={token}>
              <History />
            </PrivateRoute>
          } 
        />

        <Route 
          path="/report" 
          element={
            <PrivateRoute token={token}>
              <Report />
            </PrivateRoute>
          } 
        />

      </Routes>
    </Router>
  );
}

export default App;