import { useEffect, useState, useMemo } from 'react';
import { getEquipment, getRepairs, getBorrowList } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

/* ================= TOOLTIPS ================= */
const CustomTooltipRepair = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, qty } = payload[0].payload;
    return (
      <div style={{
        background: 'white',
        padding: '10px 14px',
        borderRadius: '12px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.15)'
      }}>
        <div style={{ color: '#1a202c', fontWeight: 600, marginBottom: 4 }}>
          {name}
        </div>
        <div style={{ color: '#e53e3e', fontWeight: 700 }}>
          qty : {qty}
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltipUsed = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, qty } = payload[0].payload;
    return (
      <div style={{
        background: 'white',
        padding: '10px 14px',
        borderRadius: '12px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.15)'
      }}>
        <div style={{ color: '#1a202c', fontWeight: 600, marginBottom: 4 }}>
          {name}
        </div>
        <div style={{ color: '#3182ce', fontWeight: 700 }}>
          qty : {qty}
        </div>
      </div>
    );
  }
  return null;
};

/* ================= COMPONENT ================= */
export default function Dashboard() {
  const [equipment, setEquipment] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      setLoading(true);
      const [eqRes, repRes, borRes] = await Promise.all([
        getEquipment(),
        getRepairs(),
        getBorrowList()
      ]);

      setEquipment(eqRes.data || []);
      setRepairs(repRes.data || []);
      setBorrows(borRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: equipment.length,

    lowStock: equipment.filter(e => {
      const available = e.available ?? e.total ?? 0;
      const threshold = e.low_stock_threshold ?? 5;

      return (
        e.type === 'reusable' &&
        available > 0 &&
        available <= threshold
      );
    }).length,

    outOfStock: equipment.filter(e => {
      const available = e.available ?? e.total ?? 0;
      return available === 0;
    }).length,

  }), [equipment]);
  const lowStockList = equipment.filter(e => {
    const available = e.available ?? e.total ?? 0;
    const threshold = e.low_stock_threshold ?? 5;

    return (
      e.type === 'reusable' &&
      available > 0 &&
      available <= threshold
    );
  });

  const outOfStockList = equipment.filter(e => {
    const available = e.available ?? e.total ?? 0;
    return available === 0;
  });

  const mostUsedData = useMemo(() => {
    const map = {};

    borrows.forEach(b => {
      b.items?.forEach(item => {
        const name = item.equipment?.name;
        if (!name) return;

        map[name] = (map[name] || 0) + Number(item.quantity || 0);
      });
    });

    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [borrows]);

  const repairData = useMemo(() => {
    const map = {};

    repairs.forEach(r => {
      const name = r.equipment?.name;
      if (!name) return;

      map[name] = (map[name] || 0) + Number(r.damagedQty || 0);
    });

    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [repairs]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading__spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">ภาพรวมอุปกรณ์ทั้งหมด</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-card--total clickable"
          onClick={() => navigate('/equipment')}
        >
          <div className="stat-card__title">อุปกรณ์ทั้งหมด</div>
          <div className="stat-card__value">{stats.total}</div>
          <div className="stat-card__label">รายการทั้งหมด</div>
        </div>

        <div className="stat-card stat-card--low clickable"
          onClick={() => navigate('/equipment?filter=LOW_STOCK')}
        >
          <div className="stat-card__title">ใกล้หมด</div>
          <div className="stat-card__value">{stats.lowStock}</div>
          <div className="stat-card__label">ต่ำกว่าค่าที่กำหนด</div>
        </div>

        <div className="stat-card stat-card--out clickable"
          onClick={() => navigate('/equipment?filter=OUT_OF_STOCK')}
        >
          <div className="stat-card__title">หมดแล้ว</div>
          <div className="stat-card__value">{stats.outOfStock}</div>
          <div className="stat-card__label">ต้องรีบสั่งเพิ่ม</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">

        <div className="chart-card">
          <h3 className="list-card__title">อุปกรณ์ถูกใช้เยอะที่สุด</h3>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mostUsedData}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />

                <XAxis
                  dataKey="name"
                  tick={{ fill: '#1a202c', fontSize: 13, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e0' }}
                  tickLine={{ stroke: '#cbd5e0' }}
                />

                <YAxis
                  tick={{ fill: '#1a202c', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e0' }}
                  tickLine={{ stroke: '#cbd5e0' }}
                />

                <Tooltip content={<CustomTooltipUsed />} />

                <Bar
                  dataKey="qty"
                  fill="#667eea"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="list-card__title">อุปกรณ์ที่ซ่อมบ่อยที่สุด</h3>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={repairData}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />

                <XAxis
                  dataKey="name"
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#1a202c', fontSize: 13, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e0' }}
                  tickLine={{ stroke: '#cbd5e0' }}
                />

                <YAxis
                  tick={{ fill: '#1a202c', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e0' }}
                  tickLine={{ stroke: '#cbd5e0' }}
                />

                <Tooltip content={<CustomTooltipRepair />} />

                <Bar
                  dataKey="qty"
                  fill="#ef4f4f"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Lists */}
      <div className="lists-grid">

        <div className="list-card">
          <div className="list-card__header">
            <h3 className="list-card__title">ใกล้หมด</h3>
          </div>

          <div className="list-card__items">
            {lowStockList.length > 0 ? (
              lowStockList.map(e => {
                const available = e.available ?? e.total ?? 0;
                return (
                  <div key={e._id} className="list-item list-item--low">
                    <span className="list-item__name">{e.name}</span>
                    <span className="list-item__value">เหลือ {available}</span>
                  </div>
                );
              })

            ) : (
              <div className="empty-state">ไม่มีอุปกรณ์ใกล้หมด</div>
            )}
          </div>
        </div>

        <div className="list-card">
          <div className="list-card__header">
            <h3 className="list-card__title">หมดแล้ว</h3>
          </div>

          <div className="list-card__items">
            {outOfStockList.length > 0 ? (
              outOfStockList.map(e => (
                <div key={e._id} className="list-item list-item--out">
                  <span className="list-item__name">{e.name}</span>
                  <span className="list-item__value">หมด</span>
                </div>
              ))
            ) : (
              <div className="empty-state">ไม่มีอุปกรณ์หมด</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
