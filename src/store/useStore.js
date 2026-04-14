import { create } from "zustand";
import { supabase, authenticateWithTelegram } from "../services/supabase";

const useStore = create((set, get) => ({
  // Состояние пользователя
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Текущие оценки сфер жизни
  currentRatings: {},

  // История оценок
  ratingsHistory: [],

  // Цели
  goals: [],

  // Установка пользователя
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // Инициализация приложения
  initialize: async (telegramInitData) => {
    try {
      set({ isLoading: true });

      // Аутентификация через Telegram
      const authData = await get().authenticateUser(telegramInitData);

      if (authData?.user) {
        set({ user: authData.user, isAuthenticated: true });

        // Загрузка данных пользователя
        await Promise.all([
          get().loadCurrentRatings(),
          get().loadRatingsHistory(),
          get().loadGoals(),
        ]);
      }
    } catch (error) {
      console.error("Initialization error:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  authenticateUser: async (initData) => {
    try {
      // Проверяем есть ли уже сессия
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        console.log("Existing session found");
        return { user: session.user };
      }

      // Используем правильную аутентификацию через Telegram
      const authData = await authenticateWithTelegram(initData);

      console.log("Telegram auth successful");
      return authData;
    } catch (error) {
      console.error("Auth error:", error);
      throw error;
    }
  },

  // Добавить в useStore
  authenticateWithOAuth: async (telegramUser) => {
    try {
      const authData = await authenticateWithTelegramOAuth(telegramUser);

      if (authData?.user) {
        set({ user: authData.user, isAuthenticated: true });

        // Загрузка данных пользователя
        await Promise.all([
          get().loadCurrentRatings(),
          get().loadRatingsHistory(),
          get().loadGoals(),
        ]);
      }

      return authData;
    } catch (error) {
      console.error("OAuth auth error:", error);
      throw error;
    }
  },

  // Загрузка текущих оценок
  loadCurrentRatings: async () => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("user_id", get().user?.id)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;

      const ratingsMap = {};
      data?.forEach((rating) => {
        ratingsMap[rating.sphere_id] = rating.value;
      });

      set({ currentRatings: ratingsMap });
    } catch (error) {
      console.error("Error loading ratings:", error);
    }
  },

  // Сохранение оценки сферы
  saveRating: async (sphereId, value) => {
    try {
      const { error } = await supabase.from("ratings").insert({
        user_id: get().user?.id,
        sphere_id: sphereId,
        value: value,
      });

      if (error) throw error;

      // Обновляем локальное состояние
      set((state) => ({
        currentRatings: { ...state.currentRatings, [sphereId]: value },
      }));

      // Перезагружаем историю
      await get().loadRatingsHistory();
    } catch (error) {
      console.error("Error saving rating:", error);
      throw error;
    }
  },

  // Загрузка истории оценок
  loadRatingsHistory: async () => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("user_id", get().user?.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      set({ ratingsHistory: data || [] });
    } catch (error) {
      console.error("Error loading history:", error);
    }
  },

  // Загрузка целей
  loadGoals: async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", get().user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      set({ goals: data || [] });
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  },

  // Создание цели
  createGoal: async (sphereId, title, description, deadline) => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: get().user?.id,
          sphere_id: sphereId,
          title,
          description,
          deadline,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        goals: [data, ...state.goals],
      }));

      return data;
    } catch (error) {
      console.error("Error creating goal:", error);
      throw error;
    }
  },

  // Обновление статуса цели
  updateGoalStatus: async (goalId, status) => {
    try {
      const { error } = await supabase
        .from("goals")
        .update({ status })
        .eq("id", goalId);

      if (error) throw error;

      set((state) => ({
        goals: state.goals.map((g) => (g.id === goalId ? { ...g, status } : g)),
      }));
    } catch (error) {
      console.error("Error updating goal:", error);
      throw error;
    }
  },

  // Удаление цели
  deleteGoal: async (goalId) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", goalId);

      if (error) throw error;

      set((state) => ({
        goals: state.goals.filter((g) => g.id !== goalId),
      }));
    } catch (error) {
      console.error("Error deleting goal:", error);
      throw error;
    }
  },
}));

export default useStore;
