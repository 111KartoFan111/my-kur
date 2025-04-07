import React, { useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import '../styles/Block/FeaturedMain.css'

const CarDetailsModal = ({ car, onClose }) => {
  if (!car) return null;

  // Parse JSON strings for characteristics and gallery
  const characteristics = typeof car.characteristics === 'string' 
    ? JSON.parse(car.characteristics) 
    : car.characteristics;
  
  const gallery = typeof car.gallery === 'string' 
    ? JSON.parse(car.gallery) 
    : car.gallery || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-header">
          <h2>{car.brand} {car.model}</h2>
          <p>{car.shortDescription}</p>
        </div>

        <div className="modal-body">
          <div className="modal-gallery">
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={10}
              slidesPerView={1}
            >
              <SwiperSlide>
                <img src={car.image} alt={`${car.brand} ${car.model} - Main`} />
              </SwiperSlide>
              {gallery.map((img, index) => (
                <SwiperSlide key={index}>
                  <img src={img} alt={`${car.brand} ${car.model} - Image ${index + 1}`} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          <div className="modal-characteristics">
            <h3>Характеристики</h3>
            <div className="characteristics-grid">
              {Object.entries(characteristics).map(([key, value]) => {
                const readableKey = {
                  year: 'Год выпуска',
                  bodyType: 'Тип кузова',
                  engineType: 'Тип двигателя',
                  transmission: 'Трансмиссия',
                  driveUnit: 'Привод',
                  acceleration: 'Разгон',
                  maxSpeed: 'Максимальная скорость',
                  batteryCapacity: 'Емкость батареи',
                  range: 'Запас хода',
                  powerReserve: 'Зарядка',
                  engineVolume: 'Объем двигателя',
                  fuelConsumption: 'Расход топлива',
                  color: 'Цвет',
                  interior: 'Интерьер',
                  mileage: 'Пробег',
                }[key] || key;

                const displayValue = Array.isArray(value)
                  ? value.join(', ')
                  : value;

                return (
                  <div key={key} className="characteristic-item">
                    <span className="characteristic-label">{readableKey}:</span>
                    <span className="characteristic-value">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="price">{car.price}</div>
          <button className="contact-button">Связаться</button>
        </div>
      </div>
    </div>
  );
};

const FeaturedMain = () => {
  const [activeFilter, setActiveFilter] = useState(localStorage.getItem('featuredFilter') || '');
  const [selectedCar, setSelectedCar] = useState(null);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCars();
  }, [activeFilter]);

  const fetchCars = async () => {
    setLoading(true);
    try {
      let url = '/api/cars';
      if (activeFilter) {
        url += `?category=${encodeURIComponent(activeFilter)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить объявления');
      }
      
      const data = await response.json();
      setCars(data);
    } catch (err) {
      console.error('Ошибка при загрузке объявлений:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = (filter) => {
    setActiveFilter(filter);
    localStorage.setItem('featuredFilter', filter);
  };

  // Группировка автомобилей по слайдам (по 3 в каждом)
  const carSlides = cars.reduce((acc, car, index) => {
    const slideIndex = Math.floor(index / 3);
    if (!acc[slideIndex]) {
      acc[slideIndex] = [];
    }
    acc[slideIndex].push(car);
    return acc;
  }, []);

  if (loading && cars.length === 0) {
    return (
      <div className='FMain'>
        <div className='FLeft'>
          <h2>Объявления</h2>
        </div>
        <div className='loading-indicator'>Загрузка объявлений...</div>
      </div>
    );
  }

  if (error && cars.length === 0) {
    return (
      <div className='FMain'>
        <div className='FLeft'>
          <h2>Объявления</h2>
        </div>
        <div className='error-message'>Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className='FMain'>
      <div className='FLeft'>
        <h2>Объявления</h2>
      </div>
      <div className='Flist'>
        <div className='Ffilter'>
          <h3 onClick={() => handleFilterClick('')}>Все</h3>
          <div className='FfilterLine' style={{ display: activeFilter === '' ? 'block' : 'none' }} />
        </div>
        <div className='Ffilter'>
          <h3 onClick={() => handleFilterClick('In Stock')}>В наличии</h3>
          <div className='FfilterLine' style={{ display: activeFilter === 'In Stock' ? 'block' : 'none' }} />
        </div>
        <div className='Ffilter'>
          <h3 onClick={() => handleFilterClick('New Car')}>Новый автомобиль</h3>
          <div className='FfilterLine' style={{ display: activeFilter === 'New Car' ? 'block' : 'none' }} />
        </div>
        <div className='Ffilter'>
          <h3 onClick={() => handleFilterClick('Used Car')}>Подержанные машины</h3>
          <div className='FfilterLine' style={{ display: activeFilter === 'Used Car' ? 'block' : 'none' }} />
        </div>
      </div>
      
      {cars.length === 0 ? (
        <div className='no-cars-message'>Нет доступных объявлений</div>
      ) : (
        <div className='Slider'>
          <Swiper
            modules={[Navigation, Pagination, Scrollbar, A11y]}
            spaceBetween={50}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}
          >
            {carSlides.map((slideItems, slideIndex) => (
              <SwiperSlide key={slideIndex}>
                <div className='slide-container' style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '20px'
                }}>
                  {slideItems.map((car) => {
                    // Парсим JSON строки в объекты
                    const characteristics = typeof car.characteristics === 'string' 
                      ? JSON.parse(car.characteristics) 
                      : car.characteristics;
                      
                    return (
                      <div key={car.id} className='item' style={{ flex: 1 }}>
                        <div className='banner' style={{ backgroundImage: `url(${car.image})` }}>
                          <div className='filter_state'>
                            <div className='status'>
                              <h4>{car.category === 'New Car' ? 'Новый' : 'В наличии'}</h4>
                            </div>
                          </div>
                        </div>
                        <div className='border'>
                          <h3>{car.brand} {car.model}</h3>
                          <div className='descreption'>
                            <h4 className='descreptionText'>{characteristics.bodyType || 'Не указано'}</h4>
                            <div className='descreptionicon'></div>
                            <h4 className='descreptionText'>{characteristics.engineType || 'Не указано'}</h4>
                            <div className='descreptionicon'></div>
                            <h4 className='descreptionText'>{characteristics.transmission || 'Не указано'}</h4>
                          </div>
                          <div className='priceBut'>
                            <div className='price'>
                              <h2>{car.price}</h2>
                            </div>
                            <div className='but'>
                              <button onClick={() => setSelectedCar(car)}>Подробнее</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {selectedCar && (
        <CarDetailsModal
          car={selectedCar}
          onClose={() => setSelectedCar(null)}
        />
      )}
    </div>
  )
}

export default FeaturedMain