import React from 'react';
import TelegramLogin from './TelegramLogin';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
  return (
    <div className="login-screen">
      <div className="login-container">
        <h1>Колесо Жизни</h1>
        <p>Войдите через Telegram для доступа к приложению</p>
        <TelegramLogin onAuthSuccess={onLogin} />
      </div>
    </div>
  );
};

export default LoginScreen;