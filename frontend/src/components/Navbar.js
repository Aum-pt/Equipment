import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/App.css';

function Navbar() {
  const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

  return (
    <nav className="navbar">
      <Link to="/">Dashboard</Link>
      <Link to="/equipment">คลังอุปกรณ์</Link>
      <Link to="/borrow">เบิกอุปกรณ์</Link>
      <Link to="/return">คืนอุปกรณ์</Link>
      <Link to="/repair">อุปกรณ์ซ่อม</Link>
      <Link to="/history">ประวัติการใช้งาน</Link>

      {/* ✅ ปุ่ม Logout */}
      <button onClick={logout} className="logout-btn">
        Logout
      </button>
    </nav>
  );
}

export default Navbar;
