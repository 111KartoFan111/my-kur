from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    cars = db.relationship('Car', backref='owner', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Car(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    brand = db.Column(db.String(80), nullable=False)
    model = db.Column(db.String(80), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.String(50), nullable=False)
    time = db.Column(db.String(20), nullable=False)
    short_description = db.Column(db.String(255), nullable=False)
    image = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="pending")  # pending, approved, rejected
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Car characteristics stored as JSON
    characteristics = db.Column(db.Text, nullable=False)
    gallery = db.Column(db.Text, nullable=True)  # JSON string of image URLs
    
    def to_dict(self):
        return {
            'id': self.id,
            'brand': self.brand,
            'model': self.model,
            'category': self.category,
            'price': self.price,
            'time': self.time,
            'shortDescription': self.short_description,
            'image': self.image,
            'characteristics': self.characteristics,
            'gallery': self.gallery,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Blog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    date = db.Column(db.String(20), nullable=False)
    image = db.Column(db.String(255), nullable=False)
    short_description = db.Column(db.String(255), nullable=False)
    full_content = db.Column(db.Text, nullable=False)
    read_time = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'date': self.date,
            'image': self.image,
            'shortDescription': self.short_description,
            'fullContent': self.full_content,
            'readTime': self.read_time
        }