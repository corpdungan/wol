import React, { useEffect } from 'react';

const TelegramLogin = ({ onAuthSuccess }) => {
  useEffect(() => {
    // Загрузка Telegram Widget Script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'wheel_of_life_auth_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    // Обработка успешной авторизации
    window.onTelegramAuth = (user) => {
      onAuthSuccess(user);
    };

    document.getElementById('telegram-login-widget').appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [onAuthSuccess]);

  return (
    <div className="telegram-login-container">
      <div id="telegram-login-widget"></div>
    </div>
  );
};

export default TelegramLogin;