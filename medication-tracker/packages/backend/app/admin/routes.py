from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from functools import wraps
import psutil
import sqlite3
import os
from datetime import datetime, timedelta
from ..models import User, Medication, Schedule
from .. import db
import json
from pathlib import Path

admin = Blueprint('admin', __name__)

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        jwt_data = get_jwt()
        if not jwt_data.get('is_admin', False):
            return jsonify({'message': 'Admin privileges required'}), 403
        return fn(*args, **kwargs)
    return wrapper

@admin.route('/health', methods=['GET'])
@jwt_required()
@admin_required
def health_check():
    """Detailed health check endpoint for admins"""
    try:
        # System metrics
        system_metrics = {
            'cpu_percent': psutil.cpu_percent(),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent,
            'timestamp': datetime.now().isoformat()
        }

        # Database metrics
        db_path = current_app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        db_size = os.path.getsize(db_path) / (1024 * 1024)  # Size in MB
        
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            # Get table sizes
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            table_counts = {}
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
                table_counts[table[0]] = cursor.fetchone()[0]

        # Application metrics
        total_users = User.query.count()
        total_medications = Medication.query.count()
        total_schedules = Schedule.query.count()
        
        # Recent activity (last 24 hours)
        yesterday = datetime.now() - timedelta(days=1)
        recent_medications = Medication.query.filter(
            Medication.created_at >= yesterday
        ).count()
        recent_schedules = Schedule.query.filter(
            Schedule.created_at >= yesterday
        ).count()

        return jsonify({
            'status': 'healthy',
            'system': system_metrics,
            'database': {
                'size_mb': round(db_size, 2),
                'table_counts': table_counts
            },
            'application': {
                'total_users': total_users,
                'total_medications': total_medications,
                'total_schedules': total_schedules,
                'recent_activity': {
                    'new_medications_24h': recent_medications,
                    'new_schedules_24h': recent_schedules
                }
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@admin.route('/performance', methods=['GET'])
@jwt_required()
@admin_required
def get_performance_metrics():
    """Get detailed performance metrics"""
    try:
        # CPU Information
        cpu_info = {
            'usage_percent': psutil.cpu_percent(interval=1, percpu=True),
            'total_usage': psutil.cpu_percent(),
            'cores': psutil.cpu_count(),
            'physical_cores': psutil.cpu_count(logical=False)
        }

        # Memory Information
        memory = psutil.virtual_memory()
        memory_info = {
            'total': memory.total / (1024 * 1024 * 1024),  # GB
            'available': memory.available / (1024 * 1024 * 1024),  # GB
            'percent_used': memory.percent,
            'used': memory.used / (1024 * 1024 * 1024)  # GB
        }

        # Disk Information
        disk = psutil.disk_usage('/')
        disk_info = {
            'total': disk.total / (1024 * 1024 * 1024),  # GB
            'used': disk.used / (1024 * 1024 * 1024),  # GB
            'free': disk.free / (1024 * 1024 * 1024),  # GB
            'percent_used': disk.percent
        }

        # Network Information
        network = psutil.net_io_counters()
        network_info = {
            'bytes_sent': network.bytes_sent,
            'bytes_recv': network.bytes_recv,
            'packets_sent': network.packets_sent,
            'packets_recv': network.packets_recv
        }

        # Process Information
        process = psutil.Process()
        process_info = {
            'memory_usage': process.memory_info().rss / (1024 * 1024),  # MB
            'cpu_usage': process.cpu_percent(),
            'threads': process.num_threads(),
            'uptime': time.time() - process.create_time()
        }

        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'cpu': cpu_info,
            'memory': memory_info,
            'disk': disk_info,
            'network': network_info,
            'process': process_info
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@admin.route('/users/activity', methods=['GET'])
@jwt_required()
@admin_required
def get_user_activity():
    """Get user activity metrics"""
    try:
        # User statistics
        total_users = User.query.count()
        active_users = User.query.filter(
            User.last_login >= (datetime.now() - timedelta(days=7))
        ).count()

        # Medication statistics
        total_medications = Medication.query.count()
        medications_by_user = db.session.query(
            User.username,
            db.func.count(Medication.id)
        ).join(Medication).group_by(User.id).all()

        # Schedule statistics
        total_schedules = Schedule.query.count()
        schedules_by_user = db.session.query(
            User.username,
            db.func.count(Schedule.id)
        ).join(Schedule).group_by(User.id).all()

        return jsonify({
            'user_stats': {
                'total_users': total_users,
                'active_users_7d': active_users,
                'user_engagement': {
                    'medications_by_user': dict(medications_by_user),
                    'schedules_by_user': dict(schedules_by_user)
                }
            },
            'activity_summary': {
                'total_medications': total_medications,
                'total_schedules': total_schedules,
                'avg_medications_per_user': total_medications / total_users if total_users > 0 else 0,
                'avg_schedules_per_user': total_schedules / total_users if total_users > 0 else 0
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@admin.route('/logs', methods=['GET'])
@jwt_required()
@admin_required
def get_logs():
    """Get application logs"""
    try:
        log_dir = Path(current_app.root_path).parent / 'logs'
        logs = []
        
        if log_dir.exists():
            for log_file in log_dir.glob('*.log'):
                with open(log_file, 'r') as f:
                    logs.extend(f.readlines()[-100:])  # Get last 100 lines
        
        return jsonify({
            'logs': logs[-100:],  # Return last 100 log entries
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@admin.route('/maintenance/vacuum', methods=['POST'])
@jwt_required()
@admin_required
def vacuum_database():
    """Optimize the database"""
    try:
        db_path = current_app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        with sqlite3.connect(db_path) as conn:
            conn.execute("VACUUM;")
        
        return jsonify({
            'status': 'success',
            'message': 'Database optimized successfully'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
