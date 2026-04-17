import { create } from "zustand";

const useStore = create((set, get) => ({
  // Данные пользователя (временно храним в памяти)
  user: { id: "local_user", user_metadata: { first_name: "Тест" } },
  isAuthenticated: true, // всегда залогинены для демо
  isLoading: false,

  // Текущие оценки сфер
  currentRatings: {},

  // История оценок
  ratingsHistory: [],

  // Цели
  goals: [],

  // Загрузка оценок (из localStorage)
  loadCurrentRatings: () => {
    const saved = localStorage.getItem("demo_ratings");
    if (saved) {
      set({ currentRatings: JSON.parse(saved) });
    } else {
      // начальные оценки для примера
      const defaultRatings = {
        health: 7, career: 5, finance: 6, relationships: 8,
        growth: 4, fun: 3, environment: 6, spirituality: 5
      };
      set({ currentRatings: defaultRatings });
    }
  },

  // Сохранение оценки
  saveRating: (sphereId, value) => {
    set((state) => {
      const newRatings = { ...state.currentRatings, [sphereId]: value };
      localStorage.setItem("demo_ratings", JSON.stringify(newRatings));
      return { currentRatings: newRatings };
    });
    get().loadRatingsHistory(); // обновим историю
  },

  // Загрузка истории (демо)
  loadRatingsHistory: () => {
    const history = localStorage.getItem("demo_history");
    if (history) {
      set({ ratingsHistory: JSON.parse(history) });
    } else {
      // создадим демо-историю
      const demoHistory = [];
      set({ ratingsHistory: demoHistory });
    }
  },

  // Загрузка целей
  loadGoals: () => {
    const goals = localStorage.getItem("demo_goals");
    if (goals) {
      set({ goals: JSON.parse(goals) });
    } else {
      set({ goals: [] });
    }
  },

  // Создание цели
  createGoal: (sphereId, title, description, deadline) => {
    const newGoal = {
      id: Date.now(),
      sphere_id: sphereId,
      title,
      description,
      deadline,
      status: "active",
      created_at: new Date().toISOString()
    };
    set((state) => {
      const newGoals = [newGoal, ...state.goals];
      localStorage.setItem("demo_goals", JSON.stringify(newGoals));
      return { goals: newGoals };
    });
    return newGoal;
  },

  // Обновление статуса цели
  updateGoalStatus: (goalId, status) => {
    set((state) => {
      const newGoals = state.goals.map(g =>
        g.id === goalId ? { ...g, status } : g
      );
      localStorage.setItem("demo_goals", JSON.stringify(newGoals));
      return { goals: newGoals };
    });
  },

  // Удаление цели
  deleteGoal: (goalId) => {
    set((state) => {
      const newGoals = state.goals.filter(g => g.id !== goalId);
      localStorage.setItem("demo_goals", JSON.stringify(newGoals));
      return { goals: newGoals };
    });
  }
}));

export default useStore;