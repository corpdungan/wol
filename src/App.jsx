import React, { useEffect, useState } from 'react';
import WheelOfLife from './components/WheelOfLife';
import HistoryChart from './components/HistoryChart';
import Goals from './components/Goals';
import useStore from './store/useStore';
import './App.css';

function App() {
  const { initialize, isLoading, isAuthenticated, user } = useStore();
  const [activeTab, setActiveTab] = useState('wheel');
  const [theme, setTheme] = useState('light');

  const applyTheme = (nextTheme) => {
    document.body.classList.toggle('dark-theme', nextTheme === 'dark');
    document.body.classList.toggle('light-theme', nextTheme === 'light');
    document.documentElement.classList.toggle('dark-theme', nextTheme === 'dark');
    document.documentElement.classList.toggle('light-theme', nextTheme === 'light');
    setTheme(nextTheme);
  };

  useEffect(() => {
    // Инициализация Telegram Mini App
    const initTelegramApp = async () => {
      const savedTheme = localStorage.getItem('wol-theme');
      const isValidSavedTheme = savedTheme === 'light' || savedTheme === 'dark';
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      let telegramTheme = null;

      try {
        // Проверяем, что мы внутри Telegram
        if (window.Telegram && window.Telegram.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();

          // Получаем данные пользователя
          const initData = tg.initDataUnsafe;
          
          if (initData && initData.user) {
            await initialize(initData);
          } else {
            // Для тестирования вне Telegram
            console.warn('Running outside Telegram environment');
            await initialize({
              user: {
                id: 123456789,
                first_name: 'Test',
                username: 'testuser'
              }
            });
          }

          telegramTheme = tg.colorScheme;
        } else {
          // Локальная разработка
          console.warn('Telegram WebApp not available, using test data');
          await initialize({
            user: {
              id: 123456789,
              first_name: 'Test',
              username: 'testuser'
            }
          });
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }

      const initialTheme = isValidSavedTheme
        ? savedTheme
        : telegramTheme === 'dark'
          ? 'dark'
          : prefersDark
            ? 'dark'
            : 'light';
      applyTheme(initialTheme);
    };

    initTelegramApp();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="error-screen">
        <div className="error-icon">⚠️</div>
        <h2>Ошибка авторизации</h2>
        <p>Не удалось войти в приложение</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Приветствие */}
      <div className="app-header">
        <div className="app-header-top">
          <h1>Колесо Жизни</h1>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              localStorage.setItem('wol-theme', nextTheme);
              applyTheme(nextTheme);
            }}
            aria-label="Переключить тему"
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Светлая' : 'Тёмная'}</span>
          </button>
        </div>
        {user && (
          <p className="user-greeting">
            Привет, {user.user_metadata?.first_name || 'друг'}! 👋
          </p>
        )}
      </div>

      {/* Навигация */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'wheel' ? 'active' : ''}`}
          onClick={() => setActiveTab('wheel')}
        >
          <span className="tab-icon">⚪</span>
          <span>Колесо</span>
        </button>
        <button
          className={`tab ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          <span className="tab-icon">🎯</span>
          <span>Цели</span>
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📊</span>
          <span>История</span>
        </button>
      </div>

      {/* Контент */}
      <div className="content">
        {activeTab === 'wheel' && <WheelOfLife theme={theme} />}
        {activeTab === 'goals' && <Goals />}
        {activeTab === 'history' && <HistoryChart theme={theme} />}
      </div>
    </div>
  );
}

export default App;
