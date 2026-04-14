// Основные типы данных приложения

export const LIFE_SPHERES = [
  { id: 'health', name: 'Здоровье', icon: '💪', color: '#FF6B6B' },
  { id: 'career', name: 'Карьера', icon: '💼', color: '#4ECDC4' },
  { id: 'finance', name: 'Финансы', icon: '💰', color: '#95E1D3' },
  { id: 'relationships', name: 'Отношения', icon: '❤️', color: '#F38181' },
  { id: 'growth', name: 'Личностный рост', icon: '🌱', color: '#AA96DA' },
  { id: 'fun', name: 'Развлечения', icon: '🎉', color: '#FCBAD3' },
  { id: 'environment', name: 'Окружение', icon: '👥', color: '#FFFFD2' },
  { id: 'spirituality', name: 'Духовность', icon: '🧘', color: '#A8D8EA' }
];

export const SPHERE_IDS = LIFE_SPHERES.map(s => s.id);

export const getSphereById = (id) => {
  return LIFE_SPHERES.find(s => s.id === id);
};
