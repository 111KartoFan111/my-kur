from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from database import db, User, Car, Blog
from werkzeug.utils import secure_filename
import json
import os
from datetime import datetime, timedelta
import random
import string

app = Flask(__name__, static_folder='../public', static_url_path='/static')
app.config['SECRET_KEY'] = ''.join(random.choices(string.ascii_letters + string.digits, k=24))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///zharkyn.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}
app.config['JWT_SECRET_KEY'] = ''.join(random.choices(string.ascii_letters + string.digits, k=24))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Ensure upload directory exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Initialize extensions
CORS(app)
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400

    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])

    # First user is admin
    if User.query.count() == 0:
        user.is_admin = True

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()

    if user and user.check_password(data['password']):
        login_user(user)
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_admin': user.is_admin
            }
        }), 200

    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'is_admin': current_user.is_admin,
        'created_at': current_user.created_at.strftime('%Y-%m-%d %H:%M:%S')
    }), 200

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json()

    if 'email' in data and data['email'] != current_user.email:
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already in use'}), 400
        current_user.email = data['email']

    if 'password' in data and data['password']:
        current_user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully'}), 200

# Car Listings API
@app.route('/api/cars', methods=['GET'])
def get_cars():
    category = request.args.get('category')
    brand = request.args.get('brand')

    query = Car.query.filter_by(status='approved')

    if category:
        query = query.filter_by(category=category)
    if brand:
        query = query.filter_by(brand=brand)

    cars = query.order_by(Car.created_at.desc()).all()
    return jsonify([car.to_dict() for car in cars]), 200

@app.route('/api/cars/<int:car_id>', methods=['GET'])
def get_car(car_id):
    car = Car.query.get_or_404(car_id)
    return jsonify(car.to_dict()), 200

@app.route('/api/cars', methods=['POST'])
@login_required
def create_car():
    data = request.json

    # Format current date as "DD.MM.YYYY"
    current_date = datetime.now().strftime('%d.%m.%Y')

    new_car = Car(
        brand=data['brand'],
        model=data['model'],
        category=data['category'],
        price=data['price'],
        time=current_date,
        short_description=data['shortDescription'],
        image=data['image'],
        characteristics=json.dumps(data['fullCharacteristics']),
        gallery=json.dumps(data.get('gallery', [])),
        user_id=current_user.id
    )

    db.session.add(new_car)
    db.session.commit()

    return jsonify({'message': 'Car listing created successfully', 'id': new_car.id}), 201

@app.route('/api/cars/<int:car_id>', methods=['PUT'])
@login_required
def update_car(car_id):
    car = Car.query.get_or_404(car_id)

    if car.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'error': 'Not authorized'}), 403

    data = request.json

    car.brand = data.get('brand', car.brand)
    car.model = data.get('model', car.model)
    car.category = data.get('category', car.category)
    car.price = data.get('price', car.price)
    car.short_description = data.get('shortDescription', car.short_description)
    car.image = data.get('image', car.image)

    if 'fullCharacteristics' in data:
        car.characteristics = json.dumps(data['fullCharacteristics'])

    if 'gallery' in data:
        car.gallery = json.dumps(data['gallery'])

    db.session.commit()
    return jsonify({'message': 'Car listing updated successfully'}), 200

@app.route('/api/cars/<int:car_id>', methods=['DELETE'])
@login_required
def delete_car(car_id):
    car = Car.query.get_or_404(car_id)

    if car.user_id != current_user.id and not current_user.is_admin:
        return jsonify({'error': 'Not authorized'}), 403

    db.session.delete(car)
    db.session.commit()

    return jsonify({'message': 'Car listing deleted successfully'}), 200

@app.route('/api/my-cars', methods=['GET'])
@login_required
def get_my_cars():
    cars = Car.query.filter_by(user_id=current_user.id).all()
    return jsonify([car.to_dict() for car in cars]), 200


@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        return jsonify({'url': f"/static/uploads/{unique_filename}"}), 200

    return jsonify({'error': 'File type not allowed'}), 400

# Blog API
@app.route('/api/blogs', methods=['GET'])
def get_blogs():
    blogs = Blog.query.order_by(Blog.created_at.desc()).all()
    return jsonify([blog.to_dict() for blog in blogs]), 200

@app.route('/api/blogs/<int:blog_id>', methods=['GET'])
def get_blog(blog_id):
    blog = Blog.query.get_or_404(blog_id)
    return jsonify(blog.to_dict()), 200

@app.route('/api/blogs', methods=['POST'])
@login_required
def create_blog():
    if not current_user.is_admin:
        return jsonify({'error': 'Only admins can create blogs'}), 403

    data = request.json

    current_date = datetime.now().strftime('%d.%m.%Y')

    new_blog = Blog(
        title=data['title'],
        author=data['author'],
        date=current_date,
        image=data['image'],
        short_description=data['shortDescription'],
        full_content=data['fullContent'],
        read_time=data['readTime']
    )
    db.session.add(new_blog)
    db.session.commit()
    return jsonify({'message': 'Blog created successfully', 'id': new_blog.id}), 201

@app.route('/api/blogs/<int:blog_id>', methods=['PUT'])
@login_required
def update_blog(blog_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Only admins can update blogs'}), 403

    blog = Blog.query.get_or_404(blog_id)
    data = request.json

    blog.title = data.get('title', blog.title)
    blog.author = data.get('author', blog.author)
    blog.image = data.get('image', blog.image)
    blog.short_description = data.get('shortDescription', blog.short_description)
    blog.full_content = data.get('fullContent', blog.full_content)
    blog.read_time = data.get('readTime', blog.read_time)

    db.session.commit()
    return jsonify({'message': 'Blog updated successfully'}), 200

@app.route('/api/blogs/<int:blog_id>', methods=['DELETE'])
@login_required
def delete_blog(blog_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Only admins can delete blogs'}), 403

    blog = Blog.query.get_or_404(blog_id)
    db.session.delete(blog)
    db.session.commit()
    return jsonify({'message': 'Blog deleted successfully'}), 200

# Admin Routes
@app.route('/api/admin/cars/pending', methods=['GET'])
@login_required
def get_pending_cars():
    if not current_user.is_admin:
        return jsonify({'error': 'Not authorized'}), 403

    cars = Car.query.filter_by(status='pending').all()
    return jsonify([car.to_dict() for car in cars]), 200

@app.route('/api/admin/cars/<int:car_id>/approve', methods=['POST'])
@login_required
def approve_car(car_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Not authorized'}), 403

    car = Car.query.get_or_404(car_id)
    car.status = 'approved'
    db.session.commit()

    return jsonify({'message': 'Car listing approved'}), 200

@app.route('/api/admin/cars/<int:car_id>/reject', methods=['POST'])
@login_required
def reject_car(car_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Not authorized'}), 403

    car = Car.query.get_or_404(car_id)
    car.status = 'rejected'
    db.session.commit()

    return jsonify({'message': 'Car listing rejected'}), 200

@app.route('/api/admin/users', methods=['GET'])
@login_required
def get_users():
    if not current_user.is_admin:
        return jsonify({'error': 'Not authorized'}), 403

    users = User.query.all()
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_admin': user.is_admin,
        'is_active': user.is_active,
        'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S')
    } for user in users]), 200

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Not authorized'}), 403

    user = User.query.get_or_404(user_id)
    data = request.json

    if 'is_admin' in data:
        user.is_admin = data['is_admin']

    if 'is_active' in data:
        user.is_active = data['is_active']

    db.session.commit()
    return jsonify({'message': 'User updated successfully'}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    if not current_user.is_admin or current_user.id == user_id:
        return jsonify({'error': 'Not authorized'}), 403

    user = User.query.get_or_404(user_id)

    Car.query.filter_by(user_id=user_id).delete()

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': 'User deleted successfully'}), 200

@app.route('/api/initialize', methods=['GET'])
def initialize_db():
    with app.app_context():
        db.create_all()
        if User.query.count() == 0:
            admin = User(
                username="admin",
                email="admin@example.com",
                is_admin=True
            )
            admin.set_password("admin123")
            db.session.add(admin)
            db.session.commit()

            try:
                with open('../src/carData.json', 'r', encoding='utf-8') as f:
                    car_data = json.load(f)
                for car_item in car_data['cars']:
                    car = Car(
                        brand=car_item['brand'],
                        model=car_item['model'],
                        category=car_item['category'],
                        price=car_item['price'],
                        time=car_item['time'],
                        short_description=car_item['shortDescription'],
                        image=car_item['image'],
                        characteristics=json.dumps(car_item['fullCharacteristics']),
                        gallery=json.dumps(car_item.get('gallery', [])),
                        user_id=admin.id,
                        status='approved'
                    )
                    db.session.add(car)

                with open('../src/blogData.json', 'r', encoding='utf-8') as f:
                    blog_data = json.load(f)
                for blog_item in blog_data['blogs']:
                    blog = Blog(
                        title=blog_item['title'],
                        author=blog_item['author'],
                        date=blog_item['date'],
                        image=blog_item['image'],
                        short_description=blog_item['shortDescription'],
                        full_content=blog_item['fullContent'],
                        read_time=blog_item['readTime']
                    )
                    db.session.add(blog)
                db.session.commit()
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        return jsonify({'message': 'Database initialized successfully'}), 200

# Car Listings API
@app.route('/api/cars', methods=['GET'])
def get_cars():
    category = request.args.get('category')
    brand = request.args.get('brand')
    sort = request.args.get('sort')
    
    query = Car.query.filter_by(status='approved')
    
    if category:
        query = query.filter_by(category=category)
    if brand:
        query = query.filter_by(brand=brand)
    
    # Добавляем сортировку по дате создания
    if sort == 'newest':
        query = query.order_by(Car.created_at.desc())
    else:
        # По умолчанию сортируем по ID
        query = query.order_by(Car.id.desc())
    
    cars = query.all()
    return jsonify([car.to_dict() for car in cars]), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)