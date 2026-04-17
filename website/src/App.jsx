import React, { useState, useEffect } from 'react';
import useStore from './store/useStore';
import WheelOfLife from './components/WheelOfLife';
import HistoryChart from './components/HistoryChart';
import Goals from './components/Goals';
import './App.css';

function App() {
  // Убрали isAuthenticated, так как не используется
  const { loadCurrentRatings, loadGoals, loadRatingsHistory } = useStore();
  const [activeTab, setActiveTab] = useState('wheel');

  useEffect(() => {
    loadCurrentRatings();
    loadGoals();
    loadRatingsHistory();
  }, [loadCurrentRatings, loadGoals, loadRatingsHistory]); // добавили зависимости

  // Всегда показываем приложение (без входа)
  return (
    <div className="app">
      <div className="app-header">
        <h1>Колесо Жизни</h1>
        <p>Демо-версия (данные хранятся в браузере)</p>
      </div>
      <div className="tabs">
        <button onClick={() => setActiveTab('wheel')}>Колесо</button>
        <button onClick={() => setActiveTab('goals')}>Цели</button>
        <button onClick={() => setActiveTab('history')}>История</button>
      </div>
      <div className="content">
        {activeTab === 'wheel' && <WheelOfLife />}
        {activeTab === 'goals' && <Goals />}
        {activeTab === 'history' && <HistoryChart />}
      </div>
    </div>
  );
}

export default App;