import React, { useEffect, useState } from "react";
import WheelOfLife from "./components/WheelOfLife";
import HistoryChart from "./components/HistoryChart";
import Goals from "./components/Goals";
import LoginScreen from "./components/LoginScreen";
import useStore from "./store/useStore";
import "./App.css";

function App() {
  const {
    initialize,
    isLoading,
    isAuthenticated,
    user,
    authenticateWithOAuth,
  } = useStore();
  const [activeTab, setActiveTab] = useState("wheel");
  const [theme, setTheme] = useState("light");
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState(false);

  const applyTheme = (nextTheme) => {
    document.body.classList.toggle("dark-theme", nextTheme === "dark");
    document.body.classList.toggle("light-theme", nextTheme === "light");
    document.documentElement.classList.toggle(
      "dark-theme",
      nextTheme === "dark",
    );
    document.documentElement.classList.toggle(
      "light-theme",
      nextTheme === "light",
    );
    setTheme(nextTheme);
  };

  const handleTelegramOAuthLogin = async (telegramUser) => {
    try {
      await authenticateWithOAuth(telegramUser);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      const savedTheme = localStorage.getItem("wol-theme");
      const isValidSavedTheme = savedTheme === "light" || savedTheme === "dark";
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      // Opredeliaem sredu - proveriaem ne tol'ko nalichie WebApp, no i dannye pol'zovatelia
      const hasTelegramWebApp = window.Telegram && window.Telegram.WebApp;
      const hasTelegramData = hasTelegramWebApp && window.Telegram.WebApp.initDataUnsafe?.user;
      const inTelegram = hasTelegramWebApp && hasTelegramData;
      setIsTelegramEnvironment(inTelegram);

      let telegramTheme = null;

      try {
        if (inTelegram) {
          // Telegram Mini App логика
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();

          const initData = tg.initDataUnsafe;

          if (initData && initData.user) {
            await initialize(initData);
          } else {
            console.warn("No Telegram user data available");
          }

          telegramTheme = tg.colorScheme;
        } else {
          // Браузерная среда - проверяем URL параметры для OAuth
          const urlParams = new URLSearchParams(window.location.search);
          const telegramAuthData = urlParams.get("telegram_auth");

          if (telegramAuthData) {
            // Обработка OAuth редиректа
            try {
              const userData = JSON.parse(decodeURIComponent(telegramAuthData));
              await handleTelegramOAuthLogin(userData);
              // Очистка URL от параметров
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname,
              );
            } catch (error) {
              console.error("Error parsing telegram auth data:", error);
            }
          }
          // Если нет данных - покажем экран входа (это уже обрабатывается в рендере)
        }
      } catch (error) {
        console.error("Initialization error:", error);
      }

      const initialTheme = isValidSavedTheme
        ? savedTheme
        : telegramTheme === "dark"
          ? "dark"
          : prefersDark
            ? "dark"
            : "light";
      applyTheme(initialTheme);
    };

    initApp();
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
    // Pokazyvaem ekran vhoga dlia vsekh neavtorizovannykh pol'zovatelei
    return <LoginScreen onLogin={handleTelegramOAuthLogin} />;
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
              const nextTheme = theme === "dark" ? "light" : "dark";
              localStorage.setItem("wol-theme", nextTheme);
              applyTheme(nextTheme);
            }}
            aria-label="Переключить тему"
            title={
              theme === "dark"
                ? "Включить светлую тему"
                : "Включить тёмную тему"
            }
          >
            <span className="theme-toggle-icon">
              {theme === "dark" ? "☀️" : "🌙"}
            </span>
            <span>{theme === "dark" ? "Светлая" : "Тёмная"}</span>
          </button>
        </div>
        {user && (
          <p className="user-greeting">
            Привет, {user.user_metadata?.first_name || "друг"}! 👋
          </p>
        )}
      </div>

      {/* Навигация */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "wheel" ? "active" : ""}`}
          onClick={() => setActiveTab("wheel")}
        >
          <span className="tab-icon">⚪</span>
          <span>Колесо</span>
        </button>
        <button
          className={`tab ${activeTab === "goals" ? "active" : ""}`}
          onClick={() => setActiveTab("goals")}
        >
          <span className="tab-icon">🎯</span>
          <span>Цели</span>
        </button>
        <button
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <span className="tab-icon">📊</span>
          <span>История</span>
        </button>
      </div>

      {/* Контент */}
      <div className="content">
        {activeTab === "wheel" && <WheelOfLife theme={theme} />}
        {activeTab === "goals" && <Goals />}
        {activeTab === "history" && <HistoryChart theme={theme} />}
      </div>
    </div>
  );
}

export default App;
