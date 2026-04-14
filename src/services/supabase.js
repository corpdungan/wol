import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Утилиты для работы с аутентификацией через Telegram
export const authenticateWithTelegram = async (initData) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `tg_${initData.user.id}@telegram.user`,
      password: initData.hash || initData.user.id.toString()
    });

    if (error && error.message.includes('Invalid login credentials')) {
      // Создаем нового пользователя
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: `tg_${initData.user.id}@telegram.user`,
        password: initData.hash || initData.user.id.toString(),
        options: {
          data: {
            telegram_id: initData.user.id,
            first_name: initData.user.first_name,
            last_name: initData.user.last_name,
            username: initData.user.username
          }
        }
      });

      if (signUpError) throw signUpError;
      return signUpData;
    }

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
};
