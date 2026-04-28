// Основные типы данных приложения

export const DEFAULT_SPHERES = [
  { id: 'health', name: 'Здоровье', icon: '💪', color: '#FF6B6B' },
  { id: 'career', name: 'Карьера', icon: '💼', color: '#4ECDC4' },
  { id: 'finance', name: 'Финансы', icon: '💰', color: '#95E1D3' },
  { id: 'relationships', name: 'Отношения', icon: '❤️', color: '#F38181' },
  { id: 'growth', name: 'Личностный рост', icon: '🌱', color: '#AA96DA' },
  { id: 'fun', name: 'Развлечения', icon: '🎉', color: '#FCBAD3' },
  { id: 'environment', name: 'Окружение', icon: '🏠', color: '#FFFFD2' },
  { id: 'spirituality', name: 'Духовность', icon: '🧘', color: '#A8D8EA' }
];

// Для обратной совместимости - теперь используйте spheres из store
export const LIFE_SPHERES = DEFAULT_SPHERES;

export const SPHERE_IDS = DEFAULT_SPHERES.map(s => s.id);

export const getSphereById = (id, spheres = DEFAULT_SPHERES) => {
  return spheres.find(s => s.id === id);
};
