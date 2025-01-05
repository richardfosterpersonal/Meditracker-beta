import sys
import psutil
import os
from datetime import datetime
import json
from pathlib import Path
import subprocess
import requests
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                            QHBoxLayout, QPushButton, QLabel, QTabWidget, 
                            QProgressBar, QTextEdit, QMessageBox)
from PyQt6.QtCore import QTimer, Qt, QThread, pyqtSignal
from PyQt6.QtGui import QFont, QIcon
import plotly.graph_objects as go
from threading import Thread
import webbrowser

class MonitoringThread(QThread):
    update_signal = pyqtSignal(dict)

    def __init__(self, project_path):
        super().__init__()
        self.project_path = Path(project_path)
        self.running = True

    def run(self):
        while self.running:
            metrics = self.collect_metrics()
            self.update_signal.emit(metrics)
            self.msleep(2000)  # Update every 2 seconds

    def collect_metrics(self):
        metrics = {
            'system': {
                'cpu': psutil.cpu_percent(),
                'memory': psutil.virtual_memory().percent,
                'disk': psutil.disk_usage('/').percent
            },
            'backend': self.check_backend(),
            'frontend': self.check_frontend(),
            'database': self.get_database_metrics()
        }
        return metrics

    def check_backend(self):
        try:
            response = requests.get('http://localhost:5000/health', timeout=1)
            return {
                'status': 'running' if response.status_code == 200 else 'error',
                'response_time': response.elapsed.total_seconds() * 1000
            }
        except:
            return {'status': 'stopped', 'response_time': 0}

    def check_frontend(self):
        try:
            response = requests.get('http://localhost:3000', timeout=1)
            return {
                'status': 'running' if response.status_code == 200 else 'error',
                'response_time': response.elapsed.total_seconds() * 1000
            }
        except:
            return {'status': 'stopped', 'response_time': 0}

    def get_database_metrics(self):
        db_path = self.project_path / 'backend' / 'instance' / 'medication_tracker.db'
        if db_path.exists():
            size_mb = db_path.stat().st_size / (1024 * 1024)
            return {'size': round(size_mb, 2), 'status': 'ok'}
        return {'size': 0, 'status': 'not found'}

class MainWindow(QMainWindow):
    def __init__(self, project_path):
        super().__init__()
        self.project_path = Path(project_path)
        self.setWindowTitle("Medication Tracker Project Monitor")
        self.setMinimumSize(800, 600)
        
        # Create main widget and layout
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)

        # Create tab widget
        tabs = QTabWidget()
        layout.addWidget(tabs)

        # Add tabs
        tabs.addTab(self.create_dashboard_tab(), "Dashboard")
        tabs.addTab(self.create_performance_tab(), "Performance")
        tabs.addTab(self.create_maintenance_tab(), "Maintenance")
        tabs.addTab(self.create_logs_tab(), "Logs")

        # Start monitoring thread
        self.monitor_thread = MonitoringThread(project_path)
        self.monitor_thread.update_signal.connect(self.update_metrics)
        self.monitor_thread.start()

        # Style
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f0f0f0;
            }
            QPushButton {
                background-color: #0078D4;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                min-width: 100px;
            }
            QPushButton:hover {
                background-color: #106EBE;
            }
            QProgressBar {
                border: 1px solid #ccc;
                border-radius: 5px;
                text-align: center;
            }
            QProgressBar::chunk {
                background-color: #0078D4;
                border-radius: 5px;
            }
        """)

    def create_dashboard_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        # System metrics
        system_group = QWidget()
        system_layout = QVBoxLayout(system_group)
        
        self.cpu_bar = self.create_metric_progress("CPU Usage")
        self.memory_bar = self.create_metric_progress("Memory Usage")
        self.disk_bar = self.create_metric_progress("Disk Usage")
        
        system_layout.addWidget(self.cpu_bar['widget'])
        system_layout.addWidget(self.memory_bar['widget'])
        system_layout.addWidget(self.disk_bar['widget'])
        
        layout.addWidget(system_group)

        # Service status
        status_group = QWidget()
        status_layout = QHBoxLayout(status_group)
        
        self.backend_status = QLabel("Backend: Unknown")
        self.frontend_status = QLabel("Frontend: Unknown")
        self.database_status = QLabel("Database: Unknown")
        
        status_layout.addWidget(self.backend_status)
        status_layout.addWidget(self.frontend_status)
        status_layout.addWidget(self.database_status)
        
        layout.addWidget(status_group)

        # Quick actions
        actions_group = QWidget()
        actions_layout = QHBoxLayout(actions_group)
        
        start_backend_btn = QPushButton("Start Backend")
        start_frontend_btn = QPushButton("Start Frontend")
        cleanup_btn = QPushButton("Run Cleanup")
        
        start_backend_btn.clicked.connect(self.start_backend)
        start_frontend_btn.clicked.connect(self.start_frontend)
        cleanup_btn.clicked.connect(self.run_cleanup)
        
        actions_layout.addWidget(start_backend_btn)
        actions_layout.addWidget(start_frontend_btn)
        actions_layout.addWidget(cleanup_btn)
        
        layout.addWidget(actions_group)
        
        return widget

    def create_performance_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        # Performance metrics
        self.performance_text = QTextEdit()
        self.performance_text.setReadOnly(True)
        layout.addWidget(self.performance_text)

        # Actions
        actions = QWidget()
        actions_layout = QHBoxLayout(actions)
        
        benchmark_btn = QPushButton("Run Benchmark")
        benchmark_btn.clicked.connect(self.run_benchmark)
        actions_layout.addWidget(benchmark_btn)
        
        layout.addWidget(actions)
        
        return widget

    def create_maintenance_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        # Maintenance actions
        actions = [
            ("Clean Environment", self.run_cleanup),
            ("Optimize Database", self.optimize_database),
            ("Clear Cache", self.clear_cache),
            ("Git Cleanup", self.git_cleanup)
        ]

        for label, action in actions:
            btn = QPushButton(label)
            btn.clicked.connect(action)
            layout.addWidget(btn)

        return widget

    def create_logs_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        layout.addWidget(self.log_text)

        refresh_btn = QPushButton("Refresh Logs")
        refresh_btn.clicked.connect(self.refresh_logs)
        layout.addWidget(refresh_btn)

        return widget

    def create_metric_progress(self, label):
        widget = QWidget()
        layout = QHBoxLayout(widget)
        
        label = QLabel(label)
        label.setMinimumWidth(100)
        progress = QProgressBar()
        value_label = QLabel("0%")
        value_label.setMinimumWidth(50)
        
        layout.addWidget(label)
        layout.addWidget(progress)
        layout.addWidget(value_label)
        
        return {'widget': widget, 'progress': progress, 'value': value_label}

    def update_metrics(self, metrics):
        # Update system metrics
        self.cpu_bar['progress'].setValue(metrics['system']['cpu'])
        self.cpu_bar['value'].setText(f"{metrics['system']['cpu']}%")
        
        self.memory_bar['progress'].setValue(metrics['system']['memory'])
        self.memory_bar['value'].setText(f"{metrics['system']['memory']}%")
        
        self.disk_bar['progress'].setValue(metrics['system']['disk'])
        self.disk_bar['value'].setText(f"{metrics['system']['disk']}%")

        # Update service status
        self.backend_status.setText(f"Backend: {metrics['backend']['status']}")
        self.frontend_status.setText(f"Frontend: {metrics['frontend']['status']}")
        self.database_status.setText(f"Database: {metrics['database']['status']}")

        # Update performance text
        performance_text = f"""
        Backend Response Time: {metrics['backend'].get('response_time', 0):.2f}ms
        Frontend Response Time: {metrics['frontend'].get('response_time', 0):.2f}ms
        Database Size: {metrics['database']['size']:.2f}MB
        """
        self.performance_text.setText(performance_text)

    def start_backend(self):
        subprocess.Popen([sys.executable, "run.py"], cwd=self.project_path / "backend")
        QMessageBox.information(self, "Success", "Backend server started!")

    def start_frontend(self):
        subprocess.Popen(["npm", "start"], cwd=self.project_path / "frontend")
        QMessageBox.information(self, "Success", "Frontend server started!")

    def run_cleanup(self):
        subprocess.Popen([sys.executable, "cleanup.py"], cwd=self.project_path)
        QMessageBox.information(self, "Success", "Cleanup script started!")

    def run_benchmark(self):
        subprocess.Popen([sys.executable, "benchmark.py"], cwd=self.project_path)
        QMessageBox.information(self, "Success", "Benchmark started!")

    def optimize_database(self):
        db_path = self.project_path / "backend" / "instance" / "medication_tracker.db"
        if db_path.exists():
            subprocess.run(["sqlite3", str(db_path), "VACUUM;"])
            QMessageBox.information(self, "Success", "Database optimized!")
        else:
            QMessageBox.warning(self, "Error", "Database file not found!")

    def clear_cache(self):
        cache_dirs = [
            self.project_path / "backend" / "__pycache__",
            self.project_path / "frontend" / ".cache"
        ]
        for d in cache_dirs:
            if d.exists():
                subprocess.run(["rm", "-rf", str(d)])
        QMessageBox.information(self, "Success", "Cache cleared!")

    def git_cleanup(self):
        subprocess.run(["git", "gc", "--aggressive", "--prune=now"], cwd=self.project_path)
        QMessageBox.information(self, "Success", "Git repository optimized!")

    def refresh_logs(self):
        log_path = self.project_path / "maintenance_logs"
        if log_path.exists():
            latest_log = max(log_path.glob("*.log"), key=os.path.getctime)
            with open(latest_log) as f:
                self.log_text.setText(f.read())

    def closeEvent(self, event):
        self.monitor_thread.running = False
        self.monitor_thread.wait()
        event.accept()

def main():
    app = QApplication(sys.argv)
    project_path = Path(__file__).parent
    window = MainWindow(project_path)
    window.show()
    sys.exit(app.exec())
