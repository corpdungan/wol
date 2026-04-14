class AIService {
  constructor() {
    this.isLoaded = false;
    this.loadScript();
  }

  loadScript() {
    if (typeof window !== 'undefined' && !window.puter) {
      const script = document.createElement('script');
      script.src = 'https://js.puter.com/v2/';
      script.onload = () => {
        this.isLoaded = true;
        console.log('Puter.js loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load Puter.js');
      };
      document.head.appendChild(script);
    } else if (window.puter) {
      this.isLoaded = true;
    }
  }

  async isAvailable() {
    if (!this.isLoaded) {
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.isLoaded) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    return this.isLoaded && window.puter;
  }


  async generateGoalSuggestions(sphereId, currentRating, existingGoals = []) {
    try {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('AI сервис недоступен');
      }

      const sphereNames = {
        health: 'Здоровье',
        career: 'Карьера', 
        finance: 'Финансы',
        relationships: 'Отношения',
        growth: 'Личностный рост',
        fun: 'Развлечения',
        environment: 'Окружение',
        spirituality: 'Духовность'
      };

      const sphereName = sphereNames[sphereId] || sphereId;
      const existingGoalsText = existingGoals.length > 0 
        ? `\nСуществующие цели: ${existingGoals.map(g => g.title).join(', ')}`
        : '';

      const prompt = `Я помогаю пользователю улучшить сферу жизни "${sphereName}". 
Текущая оценка: ${currentRating}/10.${existingGoalsText}

Предложи 3 конкретные, измеримые и достижимые цели для улучшения этой сферы. 
Учитывай существующие цели и предлагай что-то новое.

Ответ в формате JSON:
{
  "suggestions": [
    {
      "title": "Название цели",
      "description": "Подробное описание",
      "priority": "high|medium|low",
      "reasoning": "Почему это поможет улучшить сферу"
    }
  ]
}`;

      const response = await window.puter.ai.chat(prompt, {
        model: 'x-ai/grok-4-1-fast',
        temperature: 0.7
      });

      const content = response.message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Не удалось распарсить ответ AI');
      }

    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async analyzeProgress(ratingsHistory, goals) {
    try {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('AI сервис недоступен');
      }

      const prompt = `Проанализируй прогресс пользователя в развитии сфер жизни.

История оценок: ${JSON.stringify(ratingsHistory.slice(-5))}
Текущие цели: ${JSON.stringify(goals.map(g => ({ title: g.title, status: g.status, sphere: g.sphere_id })))}

Дай краткий анализ в формате JSON:
{
  "overall_trend": "improving|stable|declining",
  "strong_areas": ["сфера1", "сфера2"],
  "areas_for_improvement": ["сфера1", "сфера2"],
  "recommendations": ["рекомендация1", "рекомендация2"],
  "motivation": "мотивирующее сообщение"
}`;

      const response = await window.puter.ai.chat(prompt, {
        model: 'x-ai/grok-4-1-fast',
        temperature: 0.3
      });

      const content = response.message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Не удалось распарсить ответ AI');
      }

    } catch (error) {
      console.error('AI Analysis Error:', error);
      throw error;
    }
  }

  async generateMotivation(userProgress) {
    try {
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('AI сервис недоступен');
      }

      const prompt = `Напиши короткое мотивирующее сообщение (макс. 150 символов) для пользователя, который работает над улучшением своей жизни. 
Успехи: ${JSON.stringify(userProgress)}
Сообщение должно быть вдохновляющим и поддерживающим.`;

      const response = await window.puter.ai.chat(prompt, {
        model: 'x-ai/grok-4-1-fast',
        temperature: 0.8,
        max_tokens: 100
      });

      return response.message.content.trim();

    } catch (error) {
      console.error('Motivation Error:', error);
      return 'Продолжай двигаться вперёд! Каждый шаг важен.';
    }
  }
}

export const aiService = new AIService();