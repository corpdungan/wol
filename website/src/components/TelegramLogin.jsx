import React, { useEffect, useRef } from 'react';

const TelegramLogin = ({ onAuthSuccess }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Ждем пока DOM будет готов
    const timer = setTimeout(() => {
      if (containerRef.current) {
        // Проверяем, не загружен ли уже скрипт
        if (!document.querySelector('script[src*="telegram-widget.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://telegram.org/js/telegram-widget.js?22';
          script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'wol_it122_bot');
          script.setAttribute('data-size', 'large');
          script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram`);
          script.setAttribute('data-request-access', 'write');
          script.async = true;

          // Обработка успешной авторизации
          window.onTelegramAuth = (user) => {
            console.log('Telegram auth success:', user);
            onAuthSuccess(user);
          };

          containerRef.current.appendChild(script);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      delete window.onTelegramAuth;
    };
  }, [onAuthSuccess]);

  return (
    <div className="telegram-login-container">
      <div ref={containerRef} id="telegram-login-widget"></div>
    </div>
  );
};

export default TelegramLogin;