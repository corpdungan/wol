import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import useStore from '../store/useStore';
import { LIFE_SPHERES, getSphereById } from '../types/spheres';
import './HistoryChart.css';

const HistoryChart = ({ theme = 'light' }) => {
  const { ratingsHistory } = useStore();
  const [selectedSpheres, setSelectedSpheres] = useState(
    LIFE_SPHERES.map(s => s.id)
  );
  const axisColor = theme === 'dark' ? '#a8b3c2' : '#666';
  const gridColor = theme === 'dark' ? '#334155' : '#f0f0f0';
  const tooltipStyle = theme === 'dark'
    ? { background: '#1b2430', border: '1px solid #334155', color: '#e6edf3' }
    : { background: '#ffffff', border: '1px solid #ddd', color: '#333' };

  // Группировка данных по датам
  const chartData = useMemo(() => {
    if (!ratingsHistory || ratingsHistory.length === 0) {
      return [];
    }

    // Группируем оценки по датам
    const dateGroups = {};
    
    ratingsHistory.forEach(rating => {
      const date = format(new Date(rating.created_at), 'yyyy-MM-dd');
      
      if (!dateGroups[date]) {
        dateGroups[date] = {
          date: date,
          displayDate: format(new Date(rating.created_at), 'dd MMM', { locale: ru })
        };
      }
      
      dateGroups[date][rating.sphere_id] = rating.value;
    });

    return Object.values(dateGroups).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
  }, [ratingsHistory]);

  // Подсчет средних значений
  const averageValues = useMemo(() => {
    if (!ratingsHistory || ratingsHistory.length === 0) {
      return {};
    }

    const sphereSums = {};
    const sphereCounts = {};

    ratingsHistory.forEach(rating => {
      if (!sphereSums[rating.sphere_id]) {
        sphereSums[rating.sphere_id] = 0;
        sphereCounts[rating.sphere_id] = 0;
      }
      sphereSums[rating.sphere_id] += rating.value;
      sphereCounts[rating.sphere_id]++;
    });

    const averages = {};
    Object.keys(sphereSums).forEach(sphereId => {
      averages[sphereId] = (sphereSums[sphereId] / sphereCounts[sphereId]).toFixed(1);
    });

    return averages;
  }, [ratingsHistory]);

  const toggleSphere = (sphereId) => {
    setSelectedSpheres(prev => {
      if (prev.includes(sphereId)) {
        return prev.filter(id => id !== sphereId);
      } else {
        return [...prev, sphereId];
      }
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={tooltipStyle}>
          <p className="tooltip-label">{label}</p>
          {payload.map(entry => (
            <p key={entry.dataKey} style={{ color: entry.color }}>
              {getSphereById(entry.dataKey)?.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!ratingsHistory || ratingsHistory.length === 0) {
    return (
      <div className="history-container">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>История пока пуста</h3>
          <p>Начните оценивать сферы жизни, чтобы увидеть динамику изменений</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>История изменений</h2>
        <p className="subtitle">Динамика оценок по всем сферам жизни</p>
      </div>

      {/* Средние значения */}
      <div className="averages-section">
        <h3>Средние показатели</h3>
        <div className="averages-grid">
          {LIFE_SPHERES.map(sphere => (
            <div key={sphere.id} className="average-item">
              <span className="average-icon">{sphere.icon}</span>
              <span className="average-name">{sphere.name}</span>
              <span className="average-value" style={{ color: sphere.color }}>
                {averageValues[sphere.id] || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Фильтр сфер */}
      <div className="spheres-filter">
        <h3>Выберите сферы для отображения</h3>
        <div className="filter-buttons">
          {LIFE_SPHERES.map(sphere => (
            <button
              key={sphere.id}
              className={`filter-btn ${selectedSpheres.includes(sphere.id) ? 'active' : ''}`}
              onClick={() => toggleSphere(sphere.id)}
              style={{
                borderColor: sphere.color,
                backgroundColor: selectedSpheres.includes(sphere.id) ? sphere.color : 'transparent',
                color: selectedSpheres.includes(sphere.id) ? 'white' : sphere.color
              }}
            >
              {sphere.icon} {sphere.name}
            </button>
          ))}
        </div>
      </div>

      {/* График */}
      <div className="chart-section">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="displayDate" 
              stroke={axisColor}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              domain={[0, 10]} 
              ticks={[0, 2, 4, 6, 8, 10]}
              stroke={axisColor}
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => getSphereById(value)?.name || value}
            />
            {LIFE_SPHERES.filter(s => selectedSpheres.includes(s.id)).map(sphere => (
              <Line
                key={sphere.id}
                type="monotone"
                dataKey={sphere.id}
                stroke={sphere.color}
                strokeWidth={2}
                dot={{ fill: sphere.color, r: 4 }}
                activeDot={{ r: 6 }}
                name={sphere.name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Статистика */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-value">{ratingsHistory.length}</div>
          <div className="stat-label">Всего оценок</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {chartData.length}
          </div>
          <div className="stat-label">Дней с данными</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {Object.keys(averageValues).length}
          </div>
          <div className="stat-label">Отслеживаемых сфер</div>
        </div>
      </div>
    </div>
  );
};

export default HistoryChart;
