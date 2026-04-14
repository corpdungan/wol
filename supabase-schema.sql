-- ============================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ ПРИЛОЖЕНИЯ "КОЛЕСО ЖИЗНИ"
-- ============================================

-- Удаляем таблицы если существуют (для чистой установки)
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;

-- ============================================
-- ТАБЛИЦА: ratings (Оценки сфер жизни)
-- ============================================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sphere_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT ratings_value_check CHECK (value >= 1 AND value <= 10),
  CONSTRAINT ratings_sphere_check CHECK (sphere_id IN (
    'health', 'career', 'finance', 'relationships', 
    'growth', 'fun', 'environment', 'spirituality'
  ))
);

-- Комментарии к таблице
COMMENT ON TABLE ratings IS 'Хранит оценки пользователей по каждой сфере жизни';
COMMENT ON COLUMN ratings.user_id IS 'ID пользователя из auth.users';
COMMENT ON COLUMN ratings.sphere_id IS 'ID сферы жизни';
COMMENT ON COLUMN ratings.value IS 'Оценка от 1 до 10';
COMMENT ON COLUMN ratings.created_at IS 'Дата и время создания оценки';

-- ============================================
-- ТАБЛИЦА: goals (Цели по сферам)
-- ============================================
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sphere_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT goals_sphere_check CHECK (sphere_id IN (
    'health', 'career', 'finance', 'relationships', 
    'growth', 'fun', 'environment', 'spirituality'
  )),
  CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT goals_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 100),
  CONSTRAINT goals_description_length CHECK (description IS NULL OR char_length(description) <= 500)
);

-- Комментарии к таблице
COMMENT ON TABLE goals IS 'Цели пользователей по каждой сфере жизни';
COMMENT ON COLUMN goals.user_id IS 'ID пользователя из auth.users';
COMMENT ON COLUMN goals.sphere_id IS 'ID сферы жизни';
COMMENT ON COLUMN goals.title IS 'Название цели (макс. 100 символов)';
COMMENT ON COLUMN goals.description IS 'Описание цели (макс. 500 символов)';
COMMENT ON COLUMN goals.deadline IS 'Дедлайн для достижения цели';
COMMENT ON COLUMN goals.status IS 'Статус: active, completed, cancelled';

-- ============================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ЗАПРОСОВ
-- ============================================

-- Индексы для таблицы ratings
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_sphere_id ON ratings(sphere_id);
CREATE INDEX idx_ratings_created_at ON ratings(created_at DESC);
CREATE INDEX idx_ratings_user_sphere ON ratings(user_id, sphere_id);

-- Индексы для таблицы goals
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_sphere_id ON goals(sphere_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_deadline ON goals(deadline);
CREATE INDEX idx_goals_user_status ON goals(user_id, status);

-- ============================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для goals
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Включаем RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы ratings
CREATE POLICY "Users can view own ratings" 
  ON ratings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ratings" 
  ON ratings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" 
  ON ratings FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings" 
  ON ratings FOR DELETE 
  USING (auth.uid() = user_id);

-- Политики для таблицы goals
CREATE POLICY "Users can view own goals" 
  ON goals FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" 
  ON goals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" 
  ON goals FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" 
  ON goals FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- ТЕСТОВЫЕ ДАННЫЕ (ОПЦИОНАЛЬНО)
-- ============================================
-- Раскомментируйте для добавления тестовых данных

-- INSERT INTO ratings (user_id, sphere_id, value) VALUES
--   (auth.uid(), 'health', 7),
--   (auth.uid(), 'career', 8),
--   (auth.uid(), 'finance', 6),
--   (auth.uid(), 'relationships', 9),
--   (auth.uid(), 'growth', 7),
--   (auth.uid(), 'fun', 5),
--   (auth.uid(), 'environment', 8),
--   (auth.uid(), 'spirituality', 6);

-- INSERT INTO goals (user_id, sphere_id, title, description, deadline) VALUES
--   (auth.uid(), 'health', 'Пробежать 5км', 'Улучшить выносливость', '2026-03-31'),
--   (auth.uid(), 'career', 'Получить повышение', 'Подготовиться к собеседованию', '2026-06-30');

-- ============================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ ДЛЯ АНАЛИТИКИ
-- ============================================

-- Средние оценки по всем сферам для пользователя
-- SELECT sphere_id, AVG(value) as avg_value
-- FROM ratings
-- WHERE user_id = auth.uid()
-- GROUP BY sphere_id;

-- Статистика по целям
-- SELECT 
--   status,
--   COUNT(*) as count
-- FROM goals
-- WHERE user_id = auth.uid()
-- GROUP BY status;

-- История изменений по дням
-- SELECT 
--   DATE(created_at) as date,
--   sphere_id,
--   AVG(value) as avg_value
-- FROM ratings
-- WHERE user_id = auth.uid()
-- GROUP BY DATE(created_at), sphere_id
-- ORDER BY date DESC;

-- ============================================
-- ЗАВЕРШЕНИЕ УСТАНОВКИ
-- ============================================
-- После выполнения этого скрипта:
-- 1. Проверьте, что все таблицы созданы
-- 2. Проверьте, что RLS политики активны
-- 3. Протестируйте вставку данных
-- 4. Проверьте работу триггеров
