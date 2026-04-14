import React, { useState } from 'react';
import { LIFE_SPHERES } from '../types/spheres';
import useStore from '../store/useStore';
import './WheelOfLife.css';

const WheelOfLife = ({ theme = 'light' }) => {
  const { currentRatings, saveRating } = useStore();
  const [selectedSphere, setSelectedSphere] = useState(null);
  const [editValue, setEditValue] = useState(5);
  const gridStroke = theme === 'dark' ? '#475569' : '#e0e0e0';
  const centerStroke = theme === 'dark' ? '#e6edf3' : '#333';
  const pointStroke = theme === 'dark' ? '#0f172a' : '#ffffff';

  const centerX = 200;
  const centerY = 200;
  const maxRadius = 150;

  // Генерация точек для визуализации колеса
  const generateWheelPath = () => {
    const points = LIFE_SPHERES.map((sphere, index) => {
      const angle = (index * 360 / LIFE_SPHERES.length - 90) * Math.PI / 180;
      const value = currentRatings[sphere.id] || 0;
      const radius = (value / 10) * maxRadius;
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // Замыкаем путь
    const pathData = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';

    return pathData;
  };

  // Генерация сеток для уровней (2, 4, 6, 8, 10)
  const generateGridLines = () => {
    const levels = [2, 4, 6, 8, 10];
    return levels.map(level => {
      const points = LIFE_SPHERES.map((sphere, index) => {
        const angle = (index * 360 / LIFE_SPHERES.length - 90) * Math.PI / 180;
        const radius = (level / 10) * maxRadius;
        
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });

      const pathData = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
      ).join(' ') + ' Z';

      return { level, pathData };
    });
  };

  const handleSphereClick = (sphere) => {
    setSelectedSphere(sphere);
    setEditValue(currentRatings[sphere.id] || 5);
  };

  const handleSaveRating = async () => {
    if (selectedSphere) {
      try {
        await saveRating(selectedSphere.id, editValue);
        setSelectedSphere(null);
      } catch (error) {
        alert('Ошибка при сохранении оценки');
      }
    }
  };

  return (
    <div className="wheel-container">
      <div className="wheel-header">
        <h2>Колесо Жизни</h2>
        <p className="subtitle">Оцените каждую сферу от 1 до 10</p>
      </div>

      <svg width="400" height="400" className="wheel-svg">
        {/* Сетка уровней */}
        {generateGridLines().map(({ level, pathData }) => (
          <path
            key={level}
            d={pathData}
            fill="none"
            stroke={gridStroke}
            strokeWidth="1"
          />
        ))}

        {/* Линии от центра к краям */}
        {LIFE_SPHERES.map((sphere, index) => {
          const angle = (index * 360 / LIFE_SPHERES.length - 90) * Math.PI / 180;
          const endX = centerX + maxRadius * Math.cos(angle);
          const endY = centerY + maxRadius * Math.sin(angle);
          
          return (
            <line
              key={sphere.id}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke={gridStroke}
              strokeWidth="1"
            />
          );
        })}

        {/* Заполненная область оценок */}
        <path
          d={generateWheelPath()}
          fill="rgba(78, 205, 196, 0.3)"
          stroke="#4ECDC4"
          strokeWidth="2"
        />

        {/* Точки на каждой сфере */}
        {LIFE_SPHERES.map((sphere, index) => {
          const angle = (index * 360 / LIFE_SPHERES.length - 90) * Math.PI / 180;
          const value = currentRatings[sphere.id] || 0;
          const radius = (value / 10) * maxRadius;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          return (
            <circle
              key={sphere.id}
              cx={x}
              cy={y}
              r="6"
              fill={sphere.color}
              stroke={pointStroke}
              strokeWidth="2"
              className="sphere-point"
              onClick={() => handleSphereClick(sphere)}
            />
          );
        })}

        {/* Центральная точка */}
        <circle cx={centerX} cy={centerY} r="4" fill={centerStroke} />
      </svg>

      {/* Легенда со сферами */}
      <div className="spheres-legend">
        {LIFE_SPHERES.map(sphere => (
          <div
            key={sphere.id}
            className="sphere-item"
            onClick={() => handleSphereClick(sphere)}
            style={{ borderLeft: `4px solid ${sphere.color}` }}
          >
            <span className="sphere-icon">{sphere.icon}</span>
            <span className="sphere-name">{sphere.name}</span>
            <span className="sphere-value">
              {currentRatings[sphere.id] || 0}/10
            </span>
          </div>
        ))}
      </div>

      {/* Модальное окно редактирования */}
      {selectedSphere && (
        <div className="modal-overlay" onClick={() => setSelectedSphere(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>
              {selectedSphere.icon} {selectedSphere.name}
            </h3>
            <p>Оцените уровень удовлетворенности</p>
            
            <div className="rating-input">
              <input
                type="range"
                min="1"
                max="10"
                value={editValue}
                onChange={e => setEditValue(parseInt(e.target.value))}
                className="rating-slider"
                style={{ background: selectedSphere.color }}
              />
              <div className="rating-value">{editValue}</div>
            </div>

            <div className="modal-buttons">
              <button 
                className="btn-cancel"
                onClick={() => setSelectedSphere(null)}
              >
                Отмена
              </button>
              <button 
                className="btn-save"
                onClick={handleSaveRating}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelOfLife;
