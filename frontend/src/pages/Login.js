import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

export default function Login({ setToken }) {   
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { username, password });

      const token = res.data.token;

      localStorage.setItem('token', token);

      if (setToken) setToken(token);

      navigate('/');
    } catch (err) {
      setError('Username หรือ Password ไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">

        <h2 className="login-title">Login</h2>

        <div className="login-error">{error}</div>

        <form
          onSubmit={(e) => {
            e.preventDefault(); 
            handleLogin();
          }}
        >

          <input
            className="login-input"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />

          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button 
            className="login-button" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

        </form>

      </div>
    </div>
  );
}