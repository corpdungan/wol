import React, { useState } from 'react';
import useStore from '../store/useStore';
import './SphereManager.css';

const PRESET_ICONS = ['💪', '💼', '💰', '❤️', '🌱', '🎉', '🏠', '🧘', '📚', '🎨', '✈️', '🍎', '🚗', '👨‍👩‍👧‍👦', '🎵', '💻', '⚽', '🌿'];

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3',
  '#FFFFD2', '#A8D8EA', '#FFAAA7', '#FFD3B5', '#DCEDC2', '#A8E6CF',
  '#FF8C94', '#FFAAA6', '#FFD3A5', '#D4A5A5', '#9B59B6', '#3498DB',
  '#1ABC9C', '#F1C40F', '#E67E22', '#E74C3C', '#34495E', '#95A5A6'
];

const SphereManager = ({ onClose }) => {
  const { spheres, addSphere, updateSphere, deleteSphere, resetSpheres } = useStore();
  const [editingSphere, setEditingSphere] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    icon: '💪',
    color: '#FF6B6B'
  });

  const handleEditClick = (sphere) => {
    setEditingSphere(sphere.id);
    setFormData({
      name: sphere.name,
      icon: sphere.icon,
      color: sphere.color
    });
    setShowAddForm(false);
  };

  const handleAddClick = () => {
    setEditingSphere(null);
    setFormData({ name: '', icon: '💪', color: '#FF6B6B' });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingSphere(null);
    setShowAddForm(false);
    setFormData({ name: '', icon: '💪', color: '#FF6B6B' });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Введите название сферы');
      return;
    }

    if (editingSphere) {
      updateSphere(editingSphere, {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color
      });
      setEditingSphere(null);
    } else {
      addSphere({
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color
      });
      setShowAddForm(false);
    }

    setFormData({ name: '', icon: '💪', color: '#FF6B6B' });
  };

  const handleDelete = (id) => {
    if (spheres.length <= 3) {
      alert('Нельзя удалить сферу. Должно остаться минимум 3 сферы.');
      return;
    }

    if (confirm('Вы уверены, что хотите удалить эту сферу? Все связанные оценки и цели будут безвозвратно потеряны.')) {
      deleteSphere(id);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(false);
    resetSpheres();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sphere-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="sphere-manager-header">
          <h3>⚙️ Управление сферами</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="sphere-manager-content">
          {/* Список сфер */}
          <div className="spheres-list-section">
            <div className="spheres-list-header">
              <h4>Сферы ({spheres.length})</h4>
              <button className="btn-add-sphere" onClick={handleAddClick}>
                + Добавить
              </button>
            </div>

            <div className="spheres-list">
              {spheres.map((sphere) => (
                <div
                  key={sphere.id}
                  className={`sphere-list-item ${editingSphere === sphere.id ? 'editing' : ''}`}
                  style={{ borderLeftColor: sphere.color }}
                >
                  <div className="sphere-list-info">
                    <span className="sphere-list-icon">{sphere.icon}</span>
                    <span className="sphere-list-name">{sphere.name}</span>
                  </div>
                  <div className="sphere-list-actions">
                    <button
                      className="btn-edit-sphere"
                      onClick={() => handleEditClick(sphere)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-delete-sphere"
                      onClick={() => handleDelete(sphere.id)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {spheres.length === 0 && (
              <div className="spheres-empty">
                <p>Нет сфер. Добавьте первую сферу.</p>
              </div>
            )}
          </div>

          {/* Форма добавления/редактирования */}
          {(showAddForm || editingSphere) && (
            <div className="sphere-form-section">
              <h4>{editingSphere ? '✏️ Редактировать сферу' : '➕ Новая сфера'}</h4>

              <div className="form-group">
                <label>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Здоровье"
                  className="form-input"
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label>Иконка</label>
                <div className="icon-picker">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Цвет</label>
                <div className="color-picker">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="sphere-form-actions">
                <button className="btn-cancel" onClick={handleCancelEdit}>
                  Отмена
                </button>
                <button className="btn-save" onClick={handleSave}>
                  {editingSphere ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Кнопка сброса */}
        <div className="sphere-manager-footer">
          <button
            className="btn-reset-spheres"
            onClick={() => setShowResetConfirm(true)}
          >
            🔄 Сбросить к стандартным
          </button>
        </div>

        {/* Подтверждение сброса */}
        {showResetConfirm && (
          <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
              <h4>⚠️ Подтверждение</h4>
              <p>Все ваши изменения сфер будут потеряны и восстановлены значения по умолчанию.</p>
              <p>Продолжить?</p>
              <div className="confirm-actions">
                <button className="btn-cancel" onClick={() => setShowResetConfirm(false)}>
                  Отмена
                </button>
                <button className="btn-confirm-delete" onClick={handleReset}>
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SphereManager;
