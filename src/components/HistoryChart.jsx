import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import useStore from '../store/useStore';
import { LIFE_SPHERES, getSphereById } from '../types/spheres';
import { aiService } from '../services/puterJsService';
import './HistoryChart.css';

const HistoryChart = ({ theme = 'light' }) => {
  const { ratingsHistory, goals } = useStore();
  const [selectedSpheres, setSelectedSpheres] = useState(
    LIFE_SPHERES.map(s => s.id)
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
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

  const historyInsights = useMemo(() => {
    const latestPoint = chartData[chartData.length - 1];
    const previousPoint = chartData[chartData.length - 2];

    const latestScores = LIFE_SPHERES
      .map((sphere) => ({
        ...sphere,
        value: Number(latestPoint?.[sphere.id])
      }))
      .filter((item) => Number.isFinite(item.value));

    const latestBalance = latestScores.length > 0
      ? (latestScores.reduce((sum, item) => sum + item.value, 0) / latestScores.length).toFixed(1)
      : '—';

    const weakestLatest = latestScores.length > 0
      ? latestScores.reduce((lowest, item) => (item.value < lowest.value ? item : lowest), latestScores[0])
      : null;

    const trendDiffs = previousPoint
      ? LIFE_SPHERES
        .map((sphere) => {
          const previousValue = Number(previousPoint[sphere.id]);
          const currentValue = Number(latestPoint?.[sphere.id]);
          if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue)) {
            return null;
          }
          return {
            ...sphere,
            diff: Number((currentValue - previousValue).toFixed(1))
          };
        })
        .filter(Boolean)
      : [];

    const bestGrowth = trendDiffs.length > 0
      ? trendDiffs.reduce((best, item) => (item.diff > best.diff ? item : best), trendDiffs[0])
      : null;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 29);
    const activeDaysSet = new Set(
      ratingsHistory
        .filter((rating) => new Date(rating.created_at) >= cutoff)
        .map((rating) => format(new Date(rating.created_at), 'yyyy-MM-dd'))
    );

    const averagePairs = LIFE_SPHERES
      .map((sphere) => ({
        ...sphere,
        avg: Number(averageValues[sphere.id])
      }))
      .filter((item) => Number.isFinite(item.avg));
    const weakestAverage = averagePairs.length > 0
      ? averagePairs.reduce((lowest, item) => (item.avg < lowest.avg ? item : lowest), averagePairs[0])
      : null;

    return {
      latestBalance,
      weakestLatest,
      bestGrowth,
      activeDaysLast30: activeDaysSet.size,
      consistencyPercent: Math.round((activeDaysSet.size / 30) * 100),
      weakestAverage
    };
  }, [averageValues, chartData, ratingsHistory]);

  const areaLabel = (area) => getSphereById(area)?.name || area;

  const trendLabel = (trend) => {
    if (trend === 'improving') {
      return { text: 'Позитивная динамика', icon: '📈', className: 'trend-up' };
    }
    if (trend === 'declining') {
      return { text: 'Есть спад', icon: '📉', className: 'trend-down' };
    }
    return { text: 'Стабильное состояние', icon: '➖', className: 'trend-stable' };
  };

  const handleGenerateAIAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const result = await aiService.analyzeProgress(ratingsHistory, goals || []);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisError('Не удалось получить AI-разбор. Попробуйте снова через минуту.');
    } finally {
      setAnalysisLoading(false);
    }
  };

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

      {/* Инсайты по динамике */}
      <div className="insights-section">
        <h3>Интересные инсайты</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <p className="insight-label">Текущий баланс</p>
            <p className="insight-value">{historyInsights.latestBalance}/10</p>
            <p className="insight-note">Среднее по последнему дню с оценками</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Слабая точка сейчас</p>
            {historyInsights.weakestLatest ? (
              <>
                <p className="insight-value">
                  {historyInsights.weakestLatest.icon} {historyInsights.weakestLatest.value}/10
                </p>
                <p className="insight-note">{historyInsights.weakestLatest.name}</p>
              </>
            ) : (
              <p className="insight-note">Недостаточно данных</p>
            )}
          </div>
          <div className="insight-card">
            <p className="insight-label">Самый заметный рост</p>
            {historyInsights.bestGrowth ? (
              <>
                <p className={`insight-value ${historyInsights.bestGrowth.diff > 0 ? 'positive' : 'neutral'}`}>
                  {historyInsights.bestGrowth.diff > 0 ? '+' : ''}{historyInsights.bestGrowth.diff}
                </p>
                <p className="insight-note">
                  {historyInsights.bestGrowth.icon} {historyInsights.bestGrowth.name}
                </p>
              </>
            ) : (
              <p className="insight-note">Нужно минимум 2 дня истории</p>
            )}
          </div>
          <div className="insight-card">
            <p className="insight-label">Активность за 30 дней</p>
            <p className="insight-value">{historyInsights.activeDaysLast30} дней</p>
            <p className="insight-note">Ритм: {historyInsights.consistencyPercent}%</p>
          </div>
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

      {/* AI-разбор */}
      <div className="ai-review-section">
        <div className="ai-review-header">
          <div>
            <h3>AI-разбор прогресса</h3>
            <p className="ai-review-subtitle">Персональные выводы по вашей динамике</p>
          </div>
          <button
            type="button"
            className="btn-ai-review"
            disabled={analysisLoading}
            onClick={handleGenerateAIAnalysis}
          >
            {analysisLoading ? 'Анализируем...' : analysisResult ? 'Обновить разбор' : 'Сделать разбор'}
          </button>
        </div>

        {analysisError && <p className="ai-review-error">{analysisError}</p>}

        {analysisLoading && (
          <div className="ai-review-loading">
            <div className="loading-dot"></div>
            <p>AI анализирует тренды и готовит рекомендации...</p>
          </div>
        )}

        {analysisResult && !analysisLoading && (
          <div className="ai-review-card">
            <div className={`ai-trend-badge ${trendLabel(analysisResult.overall_trend).className}`}>
              <span>{trendLabel(analysisResult.overall_trend).icon}</span>
              <span>{trendLabel(analysisResult.overall_trend).text}</span>
            </div>
            <p className="ai-motivation">{analysisResult.motivation}</p>

            <div className="ai-columns">
              <div className="ai-column">
                <h4>Сильные сферы</h4>
                <ul>
                  {(analysisResult.strong_areas || []).map((area, index) => (
                    <li key={`strong-${index}`}>{areaLabel(area)}</li>
                  ))}
                </ul>
              </div>
              <div className="ai-column">
                <h4>Зоны улучшения</h4>
                <ul>
                  {(analysisResult.areas_for_improvement || []).map((area, index) => (
                    <li key={`growth-${index}`}>{areaLabel(area)}</li>
                  ))}
                </ul>
              </div>
            </div>

            {(analysisResult.recommendations || []).length > 0 && (
              <div className="ai-recommendations">
                <h4>Рекомендации</h4>
                <ul>
                  {analysisResult.recommendations.map((item, index) => (
                    <li key={`rec-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
            {historyInsights.weakestAverage ? `${historyInsights.weakestAverage.icon}` : Object.keys(averageValues).length}
          </div>
          <div className="stat-label">
            {historyInsights.weakestAverage ? `Нужна фокусировка: ${historyInsights.weakestAverage.name}` : 'Отслеживаемых сфер'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryChart;
