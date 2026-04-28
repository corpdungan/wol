import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LIFE_SPHERES } from '../types/spheres';
import useStore from '../store/useStore';
import './WheelOfLife.css';

const WheelOfLife = ({ theme = 'light' }) => {
  const { currentRatings, saveRating } = useStore();
  const [selectedSphere, setSelectedSphere] = useState(null);
  const [editValue, setEditValue] = useState(5);
  const [dragState, setDragState] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const svgRef = useRef(null);
  const dragStateRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const holdStateRef = useRef(null);
  const holdTimerRef = useRef(null);
  const currentRatingsRef = useRef(currentRatings);
  const suppressClickRef = useRef(null);
  const saveRatingRef = useRef(saveRating);
  const gridStroke = theme === 'dark' ? '#475569' : '#e0e0e0';
  const centerStroke = theme === 'dark' ? '#e6edf3' : '#333';
  const pointStroke = theme === 'dark' ? '#0f172a' : '#ffffff';

  const centerX = 200;
  const centerY = 200;
  const maxRadius = 150;
  const HOLD_DELAY_MS = 180;
  const HOLD_MOVE_THRESHOLD = 8;

  useEffect(() => {
    currentRatingsRef.current = currentRatings;
  }, [currentRatings]);

  useEffect(() => {
    saveRatingRef.current = saveRating;
  }, [saveRating]);

  const getSphereValue = (sphereId) => {
    if (dragPreview?.sphereId === sphereId) {
      return dragPreview.value;
    }

    return Number(currentRatings[sphereId] ?? 0);
  };

  const getPointerPositionInSvg = useCallback((event) => {
    if (!svgRef.current) {
      return null;
    }

    const rect = svgRef.current.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * 400,
      y: ((event.clientY - rect.top) / rect.height) * 400
    };
  }, []);

  const getValueFromPointer = useCallback((event, sphereId) => {
    const pointer = getPointerPositionInSvg(event);
    const fallbackValue = Number(currentRatingsRef.current[sphereId] ?? 0);

    if (!pointer) {
      return fallbackValue;
    }

    const sphereIndex = LIFE_SPHERES.findIndex((sphere) => sphere.id === sphereId);
    if (sphereIndex === -1) {
      return fallbackValue;
    }

    const angle = (sphereIndex * 360 / LIFE_SPHERES.length - 90) * Math.PI / 180;
    const axisX = Math.cos(angle);
    const axisY = Math.sin(angle);
    const dx = pointer.x - centerX;
    const dy = pointer.y - centerY;
    const projection = dx * axisX + dy * axisY;
    const clampedRadius = Math.min(maxRadius, Math.max(0, projection));
    const nextValue = Math.round((clampedRadius / maxRadius) * 10);

    return Math.min(10, Math.max(1, nextValue));
  }, [centerX, centerY, getPointerPositionInSvg, maxRadius]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handlePointPointerDown = (event, sphere) => {
    if (typeof event.button === 'number' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearHoldTimer();

    const holdState = {
      sphereId: sphere.id,
      pointerId: event.pointerId,
      activated: false,
      startX: event.clientX,
      startY: event.clientY
    };
    holdStateRef.current = holdState;

    event.currentTarget.setPointerCapture?.(event.pointerId);

    holdTimerRef.current = setTimeout(() => {
      const pendingHold = holdStateRef.current;
      if (!pendingHold || pendingHold.pointerId !== event.pointerId || pendingHold.sphereId !== sphere.id) {
        return;
      }

      const initialValue = Number(currentRatingsRef.current[sphere.id] ?? 0);
      const activeDrag = {
        sphereId: sphere.id,
        pointerId: event.pointerId,
        moved: false
      };

      holdStateRef.current = { ...pendingHold, activated: true };
      dragStateRef.current = activeDrag;
      setDragState(activeDrag);

      const preview = {
        sphereId: sphere.id,
        value: initialValue
      };
      dragPreviewRef.current = preview;
      setDragPreview(preview);

      // После long-press не открываем модалку кликом при отпускании.
      suppressClickRef.current = sphere.id;
      window.setTimeout(() => {
        if (suppressClickRef.current === sphere.id) {
          suppressClickRef.current = null;
        }
      }, 300);
      holdTimerRef.current = null;
    }, HOLD_DELAY_MS);
  };

  useEffect(() => {
    const handlePointerMove = (event) => {
      const holdState = holdStateRef.current;
      if (holdState && holdState.pointerId === event.pointerId && !holdState.activated) {
        const distance = Math.hypot(event.clientX - holdState.startX, event.clientY - holdState.startY);
        if (distance > HOLD_MOVE_THRESHOLD) {
          clearHoldTimer();
          holdStateRef.current = null;
        }
        return;
      }

      const activeDrag = dragStateRef.current;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
        return;
      }

      const nextValue = getValueFromPointer(event, activeDrag.sphereId);

      setDragPreview((previousPreview) => {
        const previousValue = previousPreview?.sphereId === activeDrag.sphereId
          ? previousPreview.value
          : Number(currentRatingsRef.current[activeDrag.sphereId] ?? 0);

        if (previousValue === nextValue) {
          return previousPreview;
        }

        if (!activeDrag.moved) {
          dragStateRef.current = { ...activeDrag, moved: true };
        }

        const nextPreview = { sphereId: activeDrag.sphereId, value: nextValue };
        dragPreviewRef.current = nextPreview;
        return nextPreview;
      });
    };

    const finishDrag = async (event) => {
      const holdState = holdStateRef.current;
      if (holdState && holdState.pointerId === event.pointerId && !holdState.activated) {
        clearHoldTimer();
        holdStateRef.current = null;
        return;
      }

      const activeDrag = dragStateRef.current;
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
        return;
      }

      const { sphereId } = activeDrag;
      const finalValue = dragPreviewRef.current?.sphereId === sphereId
        ? dragPreviewRef.current.value
        : Number(currentRatingsRef.current[sphereId] ?? 0);
      const currentValue = Number(currentRatingsRef.current[sphereId] || 0);

      setDragState(null);
      setDragPreview(null);
      dragStateRef.current = null;
      dragPreviewRef.current = null;
      holdStateRef.current = null;

      if (finalValue === currentValue || finalValue < 1) {
        return;
      }

      try {
        await saveRatingRef.current(sphereId, finalValue);
      } catch (error) {
        alert('Ошибка при сохранении оценки');
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
      clearHoldTimer();
    };
  }, [HOLD_MOVE_THRESHOLD, getValueFromPointer]);

  const weakestSphereInfo = useMemo(() => {
    const ratedSpheres = LIFE_SPHERES
      .map((sphere) => ({
        ...sphere,
        value: dragPreview?.sphereId === sphere.id
          ? dragPreview.value
          : Number(currentRatings[sphere.id] ?? 0)
      }))
      .filter((sphere) => sphere.value > 0);

    if (ratedSpheres.length === 0) {
      return null;
    }

    const minValue = Math.min(...ratedSpheres.map((sphere) => sphere.value));
    const weakestSpheres = ratedSpheres.filter((sphere) => sphere.value === minValue);

    return {
      sphere: weakestSpheres[0],
      value: minValue,
      tiedCount: weakestSpheres.length - 1
    };
  }, [currentRatings, dragPreview]);

  // Генерация точек для визуализации колеса
  const generateWheelPath = () => {
      const points = LIFE_SPHERES.map((sphere, index) => {
        const angle = (index * 360 / LIFE_SPHERES.length - 90) * Math.PI / 180;
        const value = getSphereValue(sphere.id);
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
    if (suppressClickRef.current === sphere.id) {
      suppressClickRef.current = null;
      return;
    }

    setSelectedSphere(sphere);
    setEditValue(getSphereValue(sphere.id) || 5);
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

  const generateMarkdownExport = () => {
    const date = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let markdown = `# Колесо Жизни\n\n`;
    markdown += `**Дата экспорта:** ${date}\n\n`;
    markdown += `## Оценки сфер\n\n`;
    markdown += `| Сфера | Оценка |\n`;
    markdown += `|-------|--------|\n`;

    LIFE_SPHERES.forEach(sphere => {
      const value = currentRatings[sphere.id] || 0;
      markdown += `| ${sphere.icon} ${sphere.name} | ${value}/10 |\n`;
    });

    const ratedSpheres = LIFE_SPHERES.filter(s => currentRatings[s.id] > 0);
    if (ratedSpheres.length > 0) {
      const avgRating = (ratedSpheres.reduce((sum, s) => sum + (currentRatings[s.id] || 0), 0) / ratedSpheres.length).toFixed(1);
      markdown += `\n**Средняя оценка:** ${avgRating}/10\n`;
    }
    
    return markdown;
  };

  const handleDownloadExport = () => {
    const markdown = generateMarkdownExport();
    
    // Проверяем, запущено ли в Telegram Mini App
    if (window.Telegram && window.Telegram.WebApp) {
      // В Telegram Mini App создаем data URL и открываем через Telegram API
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      // Используем openLink для открытия файла в браузере
      window.Telegram.WebApp.openLink(url);
      
      URL.revokeObjectURL(url);
    } else {
      // Стандартный способ для браузера
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wheel-of-life-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    setShowExportModal(false);
  };

  const handleEmailExport = () => {
    const markdown = generateMarkdownExport();
    const subject = encodeURIComponent('Мои оценки Колеса Жизни');
    const body = encodeURIComponent(markdown);
    
    // Проверяем, запущено ли в Telegram Mini App
    if (window.Telegram && window.Telegram.WebApp) {
      // В Telegram Mini App используем openLink для mailto
      window.Telegram.WebApp.openLink(`mailto:?subject=${subject}&body=${body}`);
    } else {
      // Стандартный способ для браузера
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
    
    setShowExportModal(false);
  };

  const handleCopyToClipboard = async () => {
    const markdown = generateMarkdownExport();
    
    try {
      // Проверяем, запущено ли в Telegram Mini App
      if (window.Telegram && window.Telegram.WebApp) {
        // Используем Telegram WebApp API для копирования
        if (window.Telegram.WebApp.writeText) {
          await window.Telegram.WebApp.writeText(markdown);
          window.Telegram.WebApp.showAlert('Данные скопированы в буфер обмена!');
        } else {
          // Fallback на стандартный API
          await navigator.clipboard.writeText(markdown);
          alert('Данные скопированы в буфер обмена!');
        }
      } else {
        // Стандартный способ для браузера
        await navigator.clipboard.writeText(markdown);
        alert('Данные скопированы в буфер обмена!');
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Не удалось скопировать данные. Попробуйте другой способ экспорта.');
    }
  };

  return (
    <div
      className="wheel-container"
      onContextMenu={(event) => event.preventDefault()}
      onContextMenuCapture={(event) => event.preventDefault()}
      onSelectStart={(event) => event.preventDefault()}
    >
      <div className="wheel-header">
        <div className="wheel-header-top">
          <h2>Колесо Жизни</h2>
          <button
            type="button"
            className="btn-export"
            onClick={() => setShowExportModal(true)}
            title="Экспортировать оценки"
          >
            📥 Экспорт
          </button>
        </div>
        <p className="subtitle">Зажмите точку и перетащите, либо нажмите на сферу для точной оценки</p>
      </div>

      <div className="weak-sphere-card">
        {weakestSphereInfo ? (
          <>
            <p className="weak-sphere-label">Слабая сфера сейчас</p>
            <button
              type="button"
              className="weak-sphere-main"
              onClick={() => handleSphereClick(weakestSphereInfo.sphere)}
            >
              <span className="weak-sphere-icon">{weakestSphereInfo.sphere.icon}</span>
              <span className="weak-sphere-meta">
                <span className="weak-sphere-name">{weakestSphereInfo.sphere.name}</span>
                <span className="weak-sphere-value">
                  {weakestSphereInfo.value}/10
                </span>
              </span>
            </button>
            {weakestSphereInfo.tiedCount > 0 && (
              <p className="weak-sphere-note">
                Еще {weakestSphereInfo.tiedCount} сфер(ы) на этом же уровне.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="weak-sphere-label">Слабая сфера сейчас</p>
            <p className="weak-sphere-empty">
              Поставьте оценку хотя бы одной сфере, и здесь появится результат.
            </p>
          </>
        )}
      </div>

      <svg ref={svgRef} width="400" height="400" viewBox="0 0 400 400" className="wheel-svg">
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
          const value = getSphereValue(sphere.id);
          const radius = (value / 10) * maxRadius;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          const isDraggingSphere = dragState?.sphereId === sphere.id;

          return (
            <circle
              key={sphere.id}
              cx={x}
              cy={y}
              r={isDraggingSphere ? 8 : 6}
              fill={sphere.color}
              stroke={pointStroke}
              strokeWidth="2"
              className={`sphere-point ${isDraggingSphere ? 'dragging' : ''}`}
              onPointerDown={(event) => handlePointPointerDown(event, sphere)}
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
              {getSphereValue(sphere.id) || 0}/10
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
                onChange={e => setEditValue(parseInt(e.target.value, 10))}
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

      {/* Модальное окно экспорта */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📥 Экспорт оценок</h3>
            <p>Выберите способ экспорта ваших оценок</p>

            <div className="export-options">
              <button
                type="button"
                className="export-option-btn"
                onClick={handleDownloadExport}
              >
                <span className="export-option-icon">💾</span>
                <span className="export-option-text">
                  <span className="export-option-title">Скачать файл</span>
                  <span className="export-option-desc">Формат Markdown (.md)</span>
                </span>
              </button>

              <button
                type="button"
                className="export-option-btn"
                onClick={handleEmailExport}
              >
                <span className="export-option-icon">📧</span>
                <span className="export-option-text">
                  <span className="export-option-title">Отправить на почту</span>
                  <span className="export-option-desc">Откроется почтовый клиент</span>
                </span>
              </button>

              <button
                type="button"
                className="export-option-btn"
                onClick={handleCopyToClipboard}
              >
                <span className="export-option-icon">📋</span>
                <span className="export-option-text">
                  <span className="export-option-title">Копировать</span>
                  <span className="export-option-desc">Скопировать в буфер обмена</span>
                </span>
              </button>
            </div>

            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setShowExportModal(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelOfLife;
