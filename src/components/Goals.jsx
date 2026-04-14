import React, { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import useStore from "../store/useStore";
import { LIFE_SPHERES, getSphereById } from "../types/spheres";
import { aiService } from "../services/puterJsService";
import "./Goals.css";

const Goals = () => {
  const { goals, createGoal, updateGoalStatus, deleteGoal, currentRatings } = useStore(); // Добавьте currentRatings
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false); // Добавьте
  const [aiSuggestions, setAiSuggestions] = useState(null); // Добавьте
  const [aiLoading, setAiLoading] = useState(false); // Добавьте
  const [selectedSphere, setSelectedSphere] = useState(null); // Добавьте
  
  const [newGoal, setNewGoal] = useState({
    sphereId: "health",
    title: "",
    description: "",
    deadline: "",
  });

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) {
      alert("Введите название цели");
      return;
    }

    try {
      await createGoal(
        newGoal.sphereId,
        newGoal.title,
        newGoal.description,
        newGoal.deadline || null,
      );

      setNewGoal({
        sphereId: "health",
        title: "",
        description: "",
        deadline: "",
      });
      setShowModal(false);
    } catch (error) {
      alert("Ошибка при создании цели");
    }
  };

  const handleGetAISuggestions = async (sphereId) => {
    setSelectedSphere(sphereId);
    setAiLoading(true);
    setShowAIModal(true);

    try {
      const sphereGoals = goals.filter((g) => g.sphere_id === sphereId);
      const currentRating = currentRatings[sphereId] || 5;

      const suggestions = await aiService.generateGoalSuggestions(
        sphereId,
        currentRating,
        sphereGoals,
      );

      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      // Показываем ошибку пользователю
      alert("Не удалось получить AI-рекомендации. Попробуйте позже.");
    } finally {
      setAiLoading(false);
    }
  };

  // Создание цели из AI-рекомендации
  const handleCreateFromAI = async (suggestion) => {
    try {
      await createGoal(
        selectedSphere,
        suggestion.title,
        suggestion.description,
        null, // без дедлайна
      );

      setShowAIModal(false);
      setAiSuggestions(null);
      setSelectedSphere(null);
    } catch (error) {
      alert("Ошибка при создании цели");
    }
  };

  const handleStatusChange = async (goalId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "completed" : "active";
    try {
      await updateGoalStatus(goalId, newStatus);
    } catch (error) {
      alert("Ошибка при обновлении статуса");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (confirm("Вы уверены, что хотите удалить эту цель?")) {
      try {
        await deleteGoal(goalId);
      } catch (error) {
        alert("Ошибка при удалении цели");
      }
    }
  };

  const groupedGoals = goals.reduce((acc, goal) => {
    if (!acc[goal.sphere_id]) {
      acc[goal.sphere_id] = [];
    }
    acc[goal.sphere_id].push(goal);
    return acc;
  }, {});

  const activeGoals = goals.filter((g) => g.status === "active").length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;

  return (
    <div className="goals-container">
      <div className="goals-header">
        <div>
          <h2>Цели по сферам жизни</h2>
          <p className="subtitle">
            Активных: {activeGoals} • Выполнено: {completedGoals}
          </p>
        </div>
        <button className="btn-add-goal" onClick={() => setShowModal(true)}>
          + Новая цель
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h3>У вас пока нет целей</h3>
          <p>Создайте первую цель для развития важных сфер жизни</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Создать цель
          </button>
        </div>
      ) : (
        <div className="goals-list">
          {LIFE_SPHERES.map((sphere) => {
            const sphereGoals = groupedGoals[sphere.id] || [];

            return (
              <div key={sphere.id} className="sphere-section">
                <div
                  className="sphere-header"
                  style={{ borderLeftColor: sphere.color }}
                >
                  <span className="sphere-icon">{sphere.icon}</span>
                  <span className="sphere-name">{sphere.name}</span>
                  <span className="sphere-count">{sphereGoals.length}</span>
                  <button
                    className="btn-ai-suggestions"
                    onClick={() => handleGetAISuggestions(sphere.id)}
                    title="Получить AI-рекомендации"
                  >
                    🤖
                  </button>
                </div>

                <div className="goals-grid">
                  {sphereGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className={`goal-card ${goal.status === "completed" ? "completed" : ""}`}
                    >
                      <div className="goal-header">
                        <input
                          type="checkbox"
                          checked={goal.status === "completed"}
                          onChange={() =>
                            handleStatusChange(goal.id, goal.status)
                          }
                          className="goal-checkbox"
                        />
                        <h4 className="goal-title">{goal.title}</h4>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          ×
                        </button>
                      </div>

                      {goal.description && (
                        <p className="goal-description">{goal.description}</p>
                      )}

                      {goal.deadline && (
                        <div className="goal-deadline">
                          📅 До{" "}
                          {format(new Date(goal.deadline), "dd MMMM yyyy", {
                            locale: ru,
                          })}
                        </div>
                      )}

                      <div className="goal-footer">
                        <span className="goal-date">
                          Создано{" "}
                          {format(new Date(goal.created_at), "dd.MM.yyyy")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                🤖 AI-рекомендации для {getSphereById(selectedSphere)?.name}
              </h3>
              <button
                className="btn-close"
                onClick={() => setShowAIModal(false)}
              >
                ×
              </button>
            </div>

            {aiLoading ? (
              <div className="ai-loading">
                <div className="loading-spinner"></div>
                <p>AI анализирует вашу ситуацию...</p>
              </div>
            ) : aiSuggestions ? (
              <div className="ai-suggestions">
                {aiSuggestions.suggestions.map((suggestion, index) => (
                  <div key={index} className="ai-suggestion-card">
                    <div className="suggestion-header">
                      <h4>{suggestion.title}</h4>
                      <span className={`priority ${suggestion.priority}`}>
                        {suggestion.priority === "high"
                          ? "Высокий"
                          : suggestion.priority === "medium"
                            ? "Средний"
                            : "Низкий"}
                      </span>
                    </div>

                    <p className="suggestion-description">
                      {suggestion.description}
                    </p>

                    <div className="suggestion-reasoning">
                      <strong>Почему это поможет:</strong>{" "}
                      {suggestion.reasoning}
                    </div>

                    <button
                      className="btn-adopt-suggestion"
                      onClick={() => handleCreateFromAI(suggestion)}
                    >
                      Принять рекомендацию
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* Модальное окно создания цели */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Новая цель</h3>

            <div className="form-group">
              <label>Сфера жизни</label>
              <select
                value={newGoal.sphereId}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, sphereId: e.target.value })
                }
                className="form-select"
              >
                {LIFE_SPHERES.map((sphere) => (
                  <option key={sphere.id} value={sphere.id}>
                    {sphere.icon} {sphere.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Название цели *</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, title: e.target.value })
                }
                placeholder="Например: Пробежать марафон"
                className="form-input"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={newGoal.description}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, description: e.target.value })
                }
                placeholder="Дополнительная информация о цели..."
                className="form-textarea"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="form-group">
              <label>Срок выполнения</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, deadline: e.target.value })
                }
                className="form-input"
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div className="modal-buttons">
              <button
                className="btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Отмена
              </button>
              <button className="btn-save" onClick={handleCreateGoal}>
                Создать цель
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
