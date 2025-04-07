import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Admin/Admin.css';

const AdminPanel = () => {
  const handleToggleUserAdmin = async (userId, isAdmin) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ is_admin: !isAdmin })
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, is_admin: !isAdmin } : user
        )
      );
      
      showNotification(`Пользователь ${isAdmin ? 'больше не администратор' : 'теперь администратор'}`, 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const handleToggleUserActive = async (userId, isActive) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ is_active: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Update user in the list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, is_active: !isActive } : user
        )
      );
      
      showNotification(`Пользователь ${isActive ? 'заблокирован' : 'разблокирован'}`, 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя? Все его объявления будут также удалены.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Remove user from the list
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      showNotification('Пользователь успешно удален', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const handleBlogFormChange = (e) => {
    const { name, value } = e.target;
    setBlogForm(prev => ({
      ...prev,
      [name]: value
    }));
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
      
      setBlogForm(prev => ({
        ...prev,
        image: data.url
      }));
    } catch (err) {
      console.error(err);
      showNotification('Failed to upload image', 'error');
    }
  };

  const handleSubmitBlog = async (e) => {
    e.preventDefault();
    
    if (!blogForm.title || !blogForm.author || !blogForm.shortDescription || !blogForm.fullContent || !blogForm.image) {
      showNotification('Пожалуйста, заполните все обязательные поля', 'error');
      return;
    }

    try {
      let response;
      
      if (editingBlogId) {
        // Update existing blog
        response = await fetch(`/api/blogs/${editingBlogId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(blogForm)
        });
      } else {
        // Create new blog
        response = await fetch('/api/blogs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(blogForm)
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save blog');
      }

      // Reset form and refresh blogs
      setBlogForm({
        title: '',
        author: '',
        shortDescription: '',
        fullContent: '',
        image: '',
        readTime: '5 минут чтения'
      });
      setEditingBlogId(null);
      fetchBlogs();
      
      showNotification(
        editingBlogId ? 'Блог успешно обновлен' : 'Блог успешно создан', 
        'success'
      );
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const handleEditBlog = (blog) => {
    setEditingBlogId(blog.id);
    setBlogForm({
      title: blog.title,
      author: blog.author,
      shortDescription: blog.shortDescription,
      fullContent: blog.fullContent,
      image: blog.image,
      readTime: blog.readTime
    });
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот блог?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete blog');
      }

      // Refresh blogs
      fetchBlogs();
      showNotification('Блог успешно удален', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const calculateReadTime = (text) => {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} ${minutes === 1 ? 'минута' : 'минут'} чтения`;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="admin-container">
      <div className="admin-sidebar">
        <h2>Админ панель</h2>
        
        <ul className="admin-menu">
          <li 
            className={activeTab === 'pendingCars' ? 'active' : ''}
            onClick={() => setActiveTab('pendingCars')}
          >
            Ожидающие объявления
          </li>
          <li 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Пользователи
          </li>
          <li 
            className={activeTab === 'blogs' ? 'active' : ''}
            onClick={() => setActiveTab('blogs')}
          >
            Блоги
          </li>
          <li onClick={() => navigate('/profile')}>
            Вернуться в профиль
          </li>
        </ul>
      </div>
      
      <div className="admin-content">
        {notification.show && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        {activeTab === 'pendingCars' && (
          <div className="pending-cars">
            <h2>Ожидающие одобрения объявления</h2>
            
            {pendingCars.length === 0 ? (
              <p className="no-items">Нет объявлений, ожидающих одобрения.</p>
            ) : (
              <div className="cars-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Фото</th>
                      <th>Марка/Модель</th>
                      <th>Категория</th>
                      <th>Цена</th>
                      <th>Дата</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCars.map(car => (
                      <tr key={car.id}>
                        <td>{car.id}</td>
                        <td>
                          <div className="car-thumb">
                            <img src={car.image} alt={`${car.brand} ${car.model}`} />
                          </div>
                        </td>
                        <td>{car.brand} {car.model}</td>
                        <td>{car.category}</td>
                        <td>{car.price}</td>
                        <td>{car.time}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn view"
                              onClick={() => setSelectedCar(car)}
                            >
                              Просмотр
                            </button>
                            <button 
                              className="btn approve"
                              onClick={() => handleApproveCar(car.id)}
                            >
                              Одобрить
                            </button>
                            <button 
                              className="btn reject"
                              onClick={() => handleRejectCar(car.id)}
                            >
                              Отклонить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="users-management">
            <h2>Управление пользователями</h2>
            
            {users.length === 0 ? (
              <p className="no-items">Нет зарегистрированных пользователей.</p>
            ) : (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Имя пользователя</th>
                      <th>Email</th>
                      <th>Статус</th>
                      <th>Роль</th>
                      <th>Дата регистрации</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                            {user.is_active ? 'Активен' : 'Заблокирован'}
                          </span>
                        </td>
                        <td>
                          <span className={`role ${user.is_admin ? 'admin' : 'user'}`}>
                            {user.is_admin ? 'Администратор' : 'Пользователь'}
                          </span>
                        </td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn toggle-admin"
                              onClick={() => handleToggleUserAdmin(user.id, user.is_admin)}
                            >
                              {user.is_admin ? 'Снять админа' : 'Сделать админом'}
                            </button>
                            <button 
                              className="btn toggle-active"
                              onClick={() => handleToggleUserActive(user.id, user.is_active)}
                            >
                              {user.is_active ? 'Заблокировать' : 'Разблокировать'}
                            </button>
                            <button 
                              className="btn delete"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'blogs' && (
          <div className="blogs-management">
            <h2>Управление блогами</h2>
            
            <div className="blog-form-container">
              <h3>{editingBlogId ? 'Редактировать блог' : 'Создать новый блог'}</h3>
              
              <form onSubmit={handleSubmitBlog} className="blog-form">
                <div className="form-group">
                  <label>Заголовок*</label>
                  <input 
                    type="text" 
                    name="title" 
                    value={blogForm.title} 
                    onChange={handleBlogFormChange} 
                    required 
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Автор*</label>
                    <input 
                      type="text" 
                      name="author" 
                      value={blogForm.author} 
                      onChange={handleBlogFormChange} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Время чтения</label>
                    <input 
                      type="text" 
                      name="readTime" 
                      value={blogForm.readTime} 
                      onChange={handleBlogFormChange} 
                    />
                    <button 
                      type="button" 
                      className="calculate-btn"
                      onClick={() => setBlogForm(prev => ({
                        ...prev,
                        readTime: calculateReadTime(prev.fullContent)
                      }))}
                    >
                      Рассчитать
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Краткое описание*</label>
                  <input 
                    type="text" 
                    name="shortDescription" 
                    value={blogForm.shortDescription} 
                    onChange={handleBlogFormChange} 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Полный текст*</label>
                  <textarea 
                    name="fullContent" 
                    value={blogForm.fullContent} 
                    onChange={handleBlogFormChange} 
                    required 
                    rows="10"
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label>Изображение*</label>
                  {blogForm.image ? (
                    <div className="image-preview">
                      <img src={blogForm.image} alt="Preview" />
                      <button 
                        type="button" 
                        className="remove-image" 
                        onClick={() => setBlogForm(prev => ({ ...prev, image: '' }))}
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <input 
                      type="file" 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                    />
                  )}
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn primary">
                    {editingBlogId ? 'Обновить блог' : 'Создать блог'}
                  </button>
                  
                  {editingBlogId && (
                    <button 
                      type="button" 
                      className="btn secondary" 
                      onClick={() => {
                        setEditingBlogId(null);
                        setBlogForm({
                          title: '',
                          author: '',
                          shortDescription: '',
                          fullContent: '',
                          image: '',
                          readTime: '5 минут чтения'
                        });
                      }}
                    >
                      Отмена
                    </button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="blogs-list">
              <h3>Список блогов</h3>
              
              {blogs.length === 0 ? (
                <p className="no-items">Нет созданных блогов.</p>
              ) : (
                <div className="blogs-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Изображение</th>
                        <th>Заголовок</th>
                        <th>Автор</th>
                        <th>Дата</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blogs.map(blog => (
                        <tr key={blog.id}>
                          <td>{blog.id}</td>
                          <td>
                            <div className="blog-thumb">
                              <img src={blog.image} alt={blog.title} />
                            </div>
                          </td>
                          <td>{blog.title}</td>
                          <td>{blog.author}</td>
                          <td>{blog.date}</td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn edit"
                                onClick={() => handleEditBlog(blog)}
                              >
                                Редактировать
                              </button>
                              <button 
                                className="btn delete"
                                onClick={() => handleDeleteBlog(blog.id)}
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {selectedCar && (
          <div className="car-modal-overlay" onClick={() => setSelectedCar(null)}>
            <div className="car-modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedCar(null)}>&times;</button>
              
              <div className="car-modal-header">
                <h2>{selectedCar.brand} {selectedCar.model}</h2>
                <p className="price">{selectedCar.price}</p>
              </div>
              
              <div className="car-modal-gallery">
                <div className="main-image">
                  <img src={selectedCar.image} alt={`${selectedCar.brand} ${selectedCar.model}`} />
                </div>
                
                {selectedCar.gallery && JSON.parse(selectedCar.gallery).length > 0 && (
                  <div className="gallery-thumbnails">
                    {JSON.parse(selectedCar.gallery).map((img, index) => (
                      <div key={index} className="thumbnail">
                        <img src={img} alt={`${selectedCar.brand} ${selectedCar.model} - ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="car-modal-description">
                <h3>Описание</h3>
                <p>{selectedCar.shortDescription}</p>
              </div>
              
              <div className="car-modal-specs">
                <h3>Характеристики</h3>
                <div className="specs-grid">
                  {selectedCar.characteristics && Object.entries(JSON.parse(selectedCar.characteristics)).map(([key, value]) => (
                    <div key={key} className="spec-item">
                      <span className="spec-label">{key}:</span>
                      <span className="spec-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="car-modal-actions">
                <button 
                  className="btn approve"
                  onClick={() => {
                    handleApproveCar(selectedCar.id);
                    setSelectedCar(null);
                  }}
                >
                  Одобрить
                </button>
                <button 
                  className="btn reject"
                  onClick={() => {
                    handleRejectCar(selectedCar.id);
                    setSelectedCar(null);
                  }}
                >
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pendingCars');
  const [pendingCars, setPendingCars] = useState([]);
  const [users, setUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [blogForm, setBlogForm] = useState({
    title: '',
    author: '',
    shortDescription: '',
    fullContent: '',
    image: '',
    readTime: '5 минут чтения'
  });
  const [editingBlogId, setEditingBlogId] = useState(null);

  useEffect(() => {
    checkAdminAccess();
    
    if (activeTab === 'pendingCars') {
      fetchPendingCars();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'blogs') {
      fetchBlogs();
    }
  }, [activeTab]);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // Redirect to login if not authenticated
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      
      // Redirect non-admin users
      if (!data.is_admin) {
        navigate('/profile');
        return;
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchPendingCars = async () => {
    try {
      const response = await fetch('/api/admin/cars/pending', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending cars');
      }

      const data = await response.json();
      setPendingCars(data);
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const fetchBlogs = async () => {
    try {
      const response = await fetch('/api/blogs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch blogs');
      }

      const data = await response.json();
      setBlogs(data);
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const handleApproveCar = async (carId) => {
    try {
      const response = await fetch(`/api/admin/cars/${carId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to approve car');
      }

      // Remove approved car from pending list
      setPendingCars(prevCars => prevCars.filter(car => car.id !== carId));
      showNotification('Объявление успешно одобрено', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const handleRejectCar = async (carId) => {
    try {
      const response = await fetch(`/api/admin/cars/${carId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to reject car');
      }

      // Remove rejected car from pending list
      setPendingCars(prevCars => prevCars.filter(car => car.id !== carId));
      showNotification('Объявление отклонено', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'error');
    }
  };

  const