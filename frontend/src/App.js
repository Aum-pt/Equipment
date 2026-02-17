import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Borrow from './pages/Borrow';
import Return from './pages/Return';
import Repair from './pages/Repair';
import Report from './pages/Report';
import History from './pages/History';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const [token, setToken] = useState(null);   // ⭐ สำคัญมาก

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) setToken(storedToken);
  }, []);

  return (
    <Router>
      {token && <Navbar />}   {/* ⭐ ตอนนี้ React รู้แล้ว */}

      <Routes>
        <Route path="/login" element={<Login setToken={setToken} />} />

        <Route path="/" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/equipment" element={
          <PrivateRoute>
            <Equipment />
          </PrivateRoute>
        } />

        <Route path="/borrow" element={
          <PrivateRoute>
            <Borrow />
          </PrivateRoute>
        } />

        <Route path="/return" element={
          <PrivateRoute>
            <Return />
          </PrivateRoute>
        } />

        <Route path="/repair" element={
          <PrivateRoute>
            <Repair />
          </PrivateRoute>
        } />

        <Route path="/history" element={
          <PrivateRoute>
            <History />
          </PrivateRoute>
        } />

        <Route path="/report" element={
          <PrivateRoute>
            <Report />
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
