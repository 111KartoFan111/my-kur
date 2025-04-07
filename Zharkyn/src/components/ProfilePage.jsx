import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Profile/Profile.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myCars, setMyCars] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [newCarForm, setNewCarForm] = useState({
    brand: '',
    model: '',
    category: 'New Car',
    price: '',
    shortDescription: '',
    image: '',
    fullCharacteristics: {
      year: new Date().getFullYear(),
      bodyType: '',
      engineType: '',
      driveUnit: '',
      color: '',
    },
    gallery: []
  });
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    fetchProfile();
    if (activeTab === 'myCars') {
      fetchMyCars();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUser(data);
      setFormData(prev => ({
        ...prev,
        email: data.email
      }));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchMyCars = async () => {
    try {
      const response = await fetch('/api/my-cars', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cars');
      }

      const data = await response.json();
      setMyCars(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setSubmitMessage('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setSubmitMessage('Profile updated successfully');
      setEditMode(false);
      fetchProfile();
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setSubmitMessage(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCarFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties (characteristics)
      const [parent, child] = name.split('.');
      setNewCarForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setNewCarForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (e.target.name === 'galleryImage') {
        // Add to gallery
        setNewCarForm(prev => ({
          ...prev,
          gallery: [...prev.gallery, data.url]
        }));
      } else {
        // Set as main image
        setNewCarForm(prev => ({
          ...prev,
          image: data.url
        }));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    }
  };

  const handleCreateCar = async (e) => {
    e.preventDefault();
    
    if (!newCarForm.brand || !newCarForm.model || !newCarForm.price || !newCarForm.image) {
      setSubmitMessage('Please fill out all required fields');
      return;
    }

    try {
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newCarForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create car listing');
      }

      setSubmitMessage('Car listing created successfully and pending approval');
      // Reset form
      setNewCarForm({
        brand: '',
        model: '',
        category: 'New Car',
        price: '',
        shortDescription: '',
        image: '',
        fullCharacteristics: {
          year: new Date().getFullYear(),
          bodyType: '',
          engineType: '',
          driveUnit: '',
          color: '',
        },
        gallery: []
      });
      
      // Refresh car listings
      fetchMyCars();
    } catch (err) {
      setSubmitMessage(err.message);
    }
  };

  const handleDeleteCar = async (carId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete car listing');
      }

      setSubmitMessage('Car listing deleted successfully');
      // Refresh car listings
      fetchMyCars();
    } catch (err) {
      setSubmitMessage(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-sidebar">
        <div className="profile-avatar">
          <div className="avatar-placeholder">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <p className="user-name">{user.username}</p>
          {user.is_admin && <span className="admin-badge">Admin</span>}
        </div>
        
        <ul className="profile-menu">
          <li 
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            Мой профиль
          </li>
          <li 
            className={activeTab === 'myCars' ? 'active' : ''}
            onClick={() => setActiveTab('myCars')}
          >
            Мои объявления
          </li>
          <li 
            className={activeTab === 'addCar' ? 'active' : ''}
            onClick={() => setActiveTab('addCar')}
          >
            Добавить объявление
          </li>
          {user.is_admin && (
            <li 
              className={activeTab === 'admin' ? 'active' : ''}
              onClick={() => navigate('/admin')}
            >
              Админ панель
            </li>
          )}
          <li className="logout" onClick={handleLogout}>
            Выйти
          </li>
        </ul>
      </div>
      
      <div className="profile-content">
        {submitMessage && (
          <div className={`alert ${submitMessage.includes('success') ? 'success' : 'error'}`}>
            {submitMessage}
            <button onClick={() => setSubmitMessage('')}>&times;</button>
          </div>
        )}
        
        {activeTab === 'profile' && (
          <div className="profile-details">
            <h2>Мой профиль</h2>
            
            {editMode ? (
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Новый пароль</label>
                  <input 
                    type="password" 
                    name="password" 
                    value={formData.password} 
                    onChange={handleInputChange} 
                  />
                  <small>Оставьте пустым, если не хотите менять</small>
                </div>
                
                <div className="form-group">
                  <label>Подтвердите пароль</label>
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    value={formData.confirmPassword} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn primary">Сохранить</button>
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={() => setEditMode(false)}
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-row">
                  <span className="label">Имя пользователя:</span>
                  <span className="value">{user.username}</span>
                </div>
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{user.email}</span>
                </div>
                <div className="info-row">
                  <span className="label">Дата регистрации:</span>
                  <span className="value">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="info-row">
                  <span className="label">Роль:</span>
                  <span className="value">{user.is_admin ? 'Администратор' : 'Пользователь'}</span>
                </div>
                
                <button 
                  className="btn primary" 
                  onClick={() => setEditMode(true)}
                >
                  Редактировать профиль
                </button>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'myCars' && (
          <div className="my-cars">
            <h2>Мои объявления</h2>
            
            {myCars.length === 0 ? (
              <p className="no-cars">У вас пока нет объявлений. Вы можете <span className="link" onClick={() => setActiveTab('addCar')}>добавить новое объявление</span>.</p>
            ) : (
              <div className="car-list">
                {myCars.map(car => (
                  <div key={car.id} className="car-card">
                    <div className="car-status">
                      {car.status === 'pending' && <span className="status pending">На модерации</span>}
                      {car.status === 'approved' && <span className="status approved">Опубликовано</span>}
                      {car.status === 'rejected' && <span className="status rejected">Отклонено</span>}
                    </div>
                    
                    <div className="car-image">
                      <img src={car.image} alt={`${car.brand} ${car.model}`} />
                    </div>
                    
                    <div className="car-details">
                      <h3>{car.brand} {car.model}</h3>
                      <p className="car-price">{car.price}</p>
                      <p className="car-description">{car.shortDescription}</p>
                      <div className="car-meta">
                        <span className="car-category">{car.category}</span>
                        <span className="car-date">{car.time}</span>
                      </div>
                    </div>
                    
                    <div className="car-actions">
                      <button 
                        className="btn danger" 
                        onClick={() => handleDeleteCar(car.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'addCar' && (
          <div className="add-car">
            <h2>Добавить новое объявление</h2>
            
            <form onSubmit={handleCreateCar} className="car-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Марка*</label>
                  <input 
                    type="text" 
                    name="brand" 
                    value={newCarForm.brand} 
                    onChange={handleCarFormChange} 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Модель*</label>
                  <input 
                    type="text" 
                    name="model" 
                    value={newCarForm.model} 
                    onChange={handleCarFormChange} 
                    required 
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Категория</label>
                  <select 
                    name="category" 
                    value={newCarForm.category} 
                    onChange={handleCarFormChange}
                  >
                    <option value="New Car">Новый автомобиль</option>
                    <option value="Used Car">Подержанный автомобиль</option>
                    <option value="In Stock">В наличии</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Цена*</label>
                  <input 
                    type="text" 
                    name="price" 
                    value={newCarForm.price} 
                    onChange={handleCarFormChange} 
                    placeholder="например, 20 000 000 ₸" 
                    required 
                  />
                </div>
              </div>
              
              <div className="form-group full-width">
                <label>Краткое описание*</label>
                <input 
                  type="text" 
                  name="shortDescription" 
                  value={newCarForm.shortDescription} 
                  onChange={handleCarFormChange} 
                  required 
                />
              </div>
              
              <div className="form-group full-width">
                <label>Главное изображение*</label>
                {newCarForm.image ? (
                  <div className="image-preview">
                    <img src={newCarForm.image} alt="Preview" />
                    <button 
                      type="button" 
                      className="remove-image" 
                      onClick={() => setNewCarForm(prev => ({ ...prev, image: '' }))}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <input 
                    type="file" 
                    name="mainImage" 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                  />
                )}
              </div>
              
              <h3>Характеристики</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Год выпуска</label>
                  <input 
                    type="number" 
                    name="fullCharacteristics.year" 
                    value={newCarForm.fullCharacteristics.year} 
                    onChange={handleCarFormChange} 
                  />
                </div>
                
                <div className="form-group">
                  <label>Тип кузова</label>
                  <select 
                    name="fullCharacteristics.bodyType" 
                    value={newCarForm.fullCharacteristics.bodyType} 
                    onChange={handleCarFormChange}
                  >
                    <option value="">Выберите тип кузова</option>
                    <option value="Седан">Седан</option>
                    <option value="Внедорожник">Внедорожник</option>
                    <option value="Хэтчбек">Хэтчбек</option>
                    <option value="Универсал">Универсал</option>
                    <option value="Купе">Купе</option>
                    <option value="Кабриолет">Кабриолет</option>
                    <option value="Минивэн">Минивэн</option>
                    <option value="Пикап">Пикап</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Тип двигателя</label>
                  <select 
                    name="fullCharacteristics.engineType" 
                    value={newCarForm.fullCharacteristics.engineType} 
                    onChange={handleCarFormChange}
                  >
                    <option value="">Выберите тип двигателя</option>
                    <option value="Бензиновый">Бензиновый</option>
                    <option value="Дизельный">Дизельный</option>
                    <option value="Электрический">Электрический</option>
                    <option value="Гибридный">Гибридный</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Привод</label>
                  <select 
                    name="fullCharacteristics.driveUnit" 
                    value={newCarForm.fullCharacteristics.driveUnit} 
                    onChange={handleCarFormChange}
                  >
                    <option value="">Выберите тип привода</option>
                    <option value="Передний привод">Передний привод</option>
                    <option value="Задний привод">Задний привод</option>
                    <option value="Полный привод">Полный привод</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Цвет</label>
                  <input 
                    type="text" 
                    name="fullCharacteristics.color" 
                    value={newCarForm.fullCharacteristics.color} 
                    onChange={handleCarFormChange} 
                  />
                </div>
              </div>
              
              <div className="form-group full-width">
                <label>Галерея изображений</label>
                <input 
                  type="file" 
                  name="galleryImage" 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                />
                
                {newCarForm.gallery.length > 0 && (
                  <div className="gallery-preview">
                    {newCarForm.gallery.map((img, index) => (
                      <div key={index} className="gallery-item">
                        <img src={img} alt={`Gallery ${index}`} />
                        <button 
                          type="button" 
                          className="remove-image" 
                          onClick={() => {
                            const newGallery = [...newCarForm.gallery];
                            newGallery.splice(index, 1);
                            setNewCarForm(prev => ({ ...prev, gallery: newGallery }));
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn primary">Создать объявление</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;