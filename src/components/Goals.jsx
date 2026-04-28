import React, { useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import useStore from "../store/useStore";
import { getSphereById } from "../types/spheres";
import { aiService } from "../services/puterJsService";
import "./Goals.css";

const STATUS_FILTERS = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "overdue", label: "Просроченные" },
  { id: "completed", label: "Выполненные" },
];

const getSafeDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDeadlineMeta = (goal, today) => {
  const deadlineDate = getSafeDate(goal.deadline);

  if (!deadlineDate || goal.status === "completed") {
    return null;
  }

  const daysLeft = differenceInCalendarDays(deadlineDate, today);

  return {
    deadlineDate,
    daysLeft,
    isOverdue: isBefore(deadlineDate, today),
    isSoon: daysLeft >= 0 && daysLeft <= 7,
  };
};

const sortGoalsByUrgency = (goalsList) =>
  [...goalsList].sort((firstGoal, secondGoal) => {
    const firstCompleted = firstGoal.status === "completed";
    const secondCompleted = secondGoal.status === "completed";

    if (firstCompleted !== secondCompleted) {
      return firstCompleted ? 1 : -1;
    }

    const firstDeadline = getSafeDate(firstGoal.deadline);
    const secondDeadline = getSafeDate(secondGoal.deadline);

    if (firstDeadline && secondDeadline) {
      return firstDeadline - secondDeadline;
    }

    if (firstDeadline && !secondDeadline) {
      return -1;
    }

    if (!firstDeadline && secondDeadline) {
      return 1;
    }

    return (
      new Date(secondGoal.created_at).getTime() -
      new Date(firstGoal.created_at).getTime()
    );
  });

const Goals = () => {
  const { spheres, goals, createGoal, updateGoalStatus, deleteGoal, currentRatings } =
    useStore();
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedSphere, setSelectedSphere] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmptySpheres, setShowEmptySpheres] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  const [newGoal, setNewGoal] = useState({
    sphereId: "health",
    title: "",
    description: "",
    deadline: "",
  });

  const today = startOfDay(new Date());
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const activeGoals = goals.filter((goal) => goal.status === "active").length;
  const completedGoals = goals.filter(
    (goal) => goal.status === "completed",
  ).length;
  const completionRate = goals.length
    ? Math.round((completedGoals / goals.length) * 100)
    : 0;

  const overdueGoals = goals.filter((goal) => {
    const deadlineMeta = getDeadlineMeta(goal, today);
    return deadlineMeta?.isOverdue;
  }).length;

  const dueSoonGoals = goals.filter((goal) => {
    const deadlineMeta = getDeadlineMeta(goal, today);
    return deadlineMeta?.isSoon;
  }).length;

  const sphereStats = useMemo(() => {
    const stats = {};

    spheres.forEach((sphere) => {
      const sphereGoals = goals.filter((goal) => goal.sphere_id === sphere.id);
      const sphereCompleted = sphereGoals.filter(
        (goal) => goal.status === "completed",
      ).length;

      stats[sphere.id] = {
        total: sphereGoals.length,
        completed: sphereCompleted,
        progress: sphereGoals.length
          ? Math.round((sphereCompleted / sphereGoals.length) * 100)
          : 0,
      };
    });

    return stats;
  }, [spheres, goals]);

  const filteredGoals = useMemo(
    () =>
      goals.filter((goal) => {
        const matchesSearch =
          !normalizedSearch ||
          goal.title?.toLowerCase().includes(normalizedSearch) ||
          goal.description?.toLowerCase().includes(normalizedSearch);

        if (!matchesSearch) {
          return false;
        }

        if (statusFilter === "active") {
          return goal.status === "active";
        }

        if (statusFilter === "completed") {
          return goal.status === "completed";
        }

        if (statusFilter === "overdue") {
          return Boolean(getDeadlineMeta(goal, today)?.isOverdue);
        }

        return true;
      }),
    [goals, normalizedSearch, statusFilter, today],
  );

  const groupedGoals = useMemo(
    () =>
      filteredGoals.reduce((accumulator, goal) => {
        if (!accumulator[goal.sphere_id]) {
          accumulator[goal.sphere_id] = [];
        }

        accumulator[goal.sphere_id].push(goal);
        return accumulator;
      }, {}),
    [filteredGoals],
  );

  const hasActiveFilters = statusFilter !== "all" || normalizedSearch.length > 0;

  const closeAIModal = () => {
    setShowAIModal(false);
    setAiLoading(false);
    setAiSuggestions(null);
    setSelectedSphere(null);
  };

  const handleCreateGoal = async () => {
    const title = newGoal.title.trim();
    const description = newGoal.description.trim();

    if (!title) {
      alert("Введите название цели");
      return;
    }

    setIsCreatingGoal(true);

    try {
      await createGoal(
        newGoal.sphereId,
        title,
        description,
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
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const handleGetAISuggestions = async (sphereId) => {
    setSelectedSphere(sphereId);
    setAiSuggestions(null);
    setAiLoading(true);
    setShowAIModal(true);

    try {
      const sphereGoals = goals.filter((goal) => goal.sphere_id === sphereId);
      const currentRating = currentRatings[sphereId] || 5;

      const suggestions = await aiService.generateGoalSuggestions(
        sphereId,
        currentRating,
        sphereGoals,
      );

      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      alert("Не удалось получить AI-рекомендации. Попробуйте позже.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateFromAI = async (suggestion) => {
    try {
      await createGoal(
        selectedSphere,
        suggestion.title,
        suggestion.description,
        null,
      );

      closeAIModal();
    } catch (error) {
      alert("Ошибка при создании цели");
    }
  };

  const handleStatusChange = async (goalId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "completed" : "active";

    try {
      await updateGoalStatus(goalId, nextStatus);
    } catch (error) {
      alert("Ошибка при обновлении статуса");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm("Вы уверены, что хотите удалить эту цель?")) {
      return;
    }

    try {
      await deleteGoal(goalId);
    } catch (error) {
      alert("Ошибка при удалении цели");
    }
  };

  const getStatusText = (goal, deadlineMeta) => {
    if (goal.status === "completed") {
      return "Выполнена";
    }

    if (deadlineMeta?.isOverdue) {
      return "Просрочена";
    }

    return "В работе";
  };

  const visibleSpheres = spheres.filter((sphere) => {
    const goalsInSphere = groupedGoals[sphere.id] || [];
    return showEmptySpheres || goalsInSphere.length > 0;
  });

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
        <>
          <div className="goals-overview">
            <div className="overview-card">
              <span className="overview-label">Прогресс</span>
              <span className="overview-value">{completionRate}%</span>
            </div>
            <div className="overview-card">
              <span className="overview-label">Просрочено</span>
              <span className="overview-value">{overdueGoals}</span>
            </div>
            <div className="overview-card">
              <span className="overview-label">До 7 дней</span>
              <span className="overview-value">{dueSoonGoals}</span>
            </div>
          </div>

          <div className="goals-toolbar">
            <div className="status-filters">
              {STATUS_FILTERS.map((filterOption) => (
                <button
                  key={filterOption.id}
                  type="button"
                  className={`filter-chip ${statusFilter === filterOption.id ? "active" : ""}`}
                  onClick={() => setStatusFilter(filterOption.id)}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>
            <div className="toolbar-controls">
              <input
                type="search"
                className="goals-search"
                value={searchQuery}
                placeholder="Поиск цели..."
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <label className="toggle-empty-spheres">
                <input
                  type="checkbox"
                  checked={showEmptySpheres}
                  onChange={(event) => setShowEmptySpheres(event.target.checked)}
                />
                Пустые сферы
              </label>
            </div>
          </div>

          {visibleSpheres.length === 0 ? (
            <div className="no-results">
              <h3>Ничего не найдено</h3>
              <p>Сбросьте фильтры или попробуйте другой поисковый запрос.</p>
              {hasActiveFilters ? (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Сбросить фильтры
                </button>
              ) : null}
            </div>
          ) : (
            <div className="goals-list">
              {visibleSpheres.map((sphere) => {
                const sphereGoals = sortGoalsByUrgency(groupedGoals[sphere.id] || []);
                const stats = sphereStats[sphere.id];

                return (
                  <div key={sphere.id} className="sphere-section">
                    <div
                      className="sphere-header"
                      style={{ borderLeftColor: sphere.color }}
                    >
                      <span className="sphere-icon">{sphere.icon}</span>
                      <div className="sphere-title-wrap">
                        <span className="sphere-name">{sphere.name}</span>
                        <span className="sphere-progress-text">
                          Прогресс: {stats.progress}%
                        </span>
                      </div>
                      <span className="sphere-count">
                        {sphereGoals.length}/{stats.total}
                      </span>
                      <button
                        className="btn-ai-suggestions"
                        onClick={() => handleGetAISuggestions(sphere.id)}
                        title="Получить AI-рекомендации"
                      >
                        🤖
                      </button>
                    </div>

                    <div className="sphere-progress">
                      <div
                        className="sphere-progress-fill"
                        style={{
                          width: `${stats.progress}%`,
                          backgroundColor: sphere.color,
                        }}
                      ></div>
                    </div>

                    {sphereGoals.length === 0 ? (
                      <div className="sphere-empty">
                        В этой сфере пока нет целей по выбранному фильтру.
                      </div>
                    ) : (
                      <div className="goals-grid">
                        {sphereGoals.map((goal) => {
                          const deadlineDate = getSafeDate(goal.deadline);
                          const deadlineMeta = getDeadlineMeta(goal, today);
                          const isOverdue = Boolean(deadlineMeta?.isOverdue);
                          const isSoon = Boolean(deadlineMeta?.isSoon);

                          return (
                            <div
                              key={goal.id}
                              className={`goal-card ${goal.status === "completed" ? "completed" : ""} ${isOverdue ? "overdue" : ""}`}
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
                                <div className="goal-title-group">
                                  <h4 className="goal-title">{goal.title}</h4>
                                  <span
                                    className={`goal-status ${goal.status} ${isOverdue ? "overdue" : ""}`}
                                  >
                                    {getStatusText(goal, deadlineMeta)}
                                  </span>
                                </div>
                                <button
                                  className="btn-delete"
                                  onClick={() => handleDeleteGoal(goal.id)}
                                >
                                  ×
                                </button>
                              </div>

                              {goal.description ? (
                                <p className="goal-description">
                                  {goal.description}
                                </p>
                              ) : null}

                              {deadlineDate ? (
                                <div
                                  className={`goal-deadline ${isOverdue ? "overdue" : ""} ${isSoon ? "soon" : ""}`}
                                >
                                  <span>
                                    📅 До{" "}
                                    {format(deadlineDate, "dd MMMM yyyy", {
                                      locale: ru,
                                    })}
                                  </span>
                                  {deadlineMeta ? (
                                    <span className="goal-deadline-hint">
                                      {deadlineMeta.daysLeft < 0
                                        ? `Просрочена на ${Math.abs(deadlineMeta.daysLeft)} дн.`
                                        : deadlineMeta.daysLeft === 0
                                          ? "Срок сегодня"
                                          : `Осталось ${deadlineMeta.daysLeft} дн.`}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="goal-footer">
                                <span className="goal-date">
                                  Создано{" "}
                                  {format(
                                    new Date(goal.created_at),
                                    "dd.MM.yyyy",
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showAIModal ? (
        <div className="modal-overlay" onClick={closeAIModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 AI-рекомендации для {getSphereById(selectedSphere)?.name}</h3>
              <button className="btn-close" onClick={closeAIModal}>
                ×
              </button>
            </div>

            {aiLoading ? (
              <div className="ai-loading">
                <div className="loading-spinner"></div>
                <p>AI анализирует вашу ситуацию...</p>
              </div>
            ) : aiSuggestions?.suggestions?.length ? (
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
            ) : (
              <div className="ai-empty">
                Пока нет рекомендаций для этой сферы. Попробуйте позже.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showModal ? (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content modal-large"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Новая цель</h3>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleCreateGoal();
              }}
            >
              <div className="form-group">
                <label>Сфера жизни</label>
                <select
                  value={newGoal.sphereId}
                  onChange={(event) =>
                    setNewGoal({ ...newGoal, sphereId: event.target.value })
                  }
                  className="form-select"
                >
                  {spheres.map((sphere) => (
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
                  onChange={(event) =>
                    setNewGoal({ ...newGoal, title: event.target.value })
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
                  onChange={(event) =>
                    setNewGoal({ ...newGoal, description: event.target.value })
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
                  onChange={(event) =>
                    setNewGoal({ ...newGoal, deadline: event.target.value })
                  }
                  className="form-input"
                  min={format(today, "yyyy-MM-dd")}
                />
              </div>

              <div className="modal-buttons">
                <button
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                  type="button"
                >
                  Отмена
                </button>
                <button className="btn-save" type="submit" disabled={isCreatingGoal}>
                  {isCreatingGoal ? "Создание..." : "Создать цель"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Goals;
