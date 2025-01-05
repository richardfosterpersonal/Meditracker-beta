import psutil
import time
import os
import json
from datetime import datetime
from pathlib import Path
import subprocess
import requests
from threading import Thread
import signal
import docker

class AppMonitor:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.running = True
        self.metrics = {
            'backend': {'cpu': 0, 'memory': 0, 'status': 'unknown'},
            'frontend': {'cpu': 0, 'memory': 0, 'status': 'unknown'},
            'database': {'size': 0, 'connections': 0},
            'system': {'cpu': 0, 'memory': 0, 'disk': 0},
            'beta_deployment': {
                'status': 'initializing',
                'start_time': datetime.now().isoformat(),
                'components_ready': {
                    'backend': False,
                    'frontend': False,
                    'database': False,
                    'redis': False
                }
            }
        }
        self.client = docker.from_env()

    def get_process_by_name(self, name):
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if name.lower() in ' '.join(proc.info['cmdline'] or []).lower():
                    return proc
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return None

    def check_backend_health(self):
        try:
            response = requests.get('http://localhost:5000/health', timeout=2)
            return response.status_code == 200
        except:
            return False

    def check_frontend_health(self):
        try:
            response = requests.get('http://localhost:3000', timeout=2)
            return response.status_code == 200
        except:
            return False

    def get_database_metrics(self):
        db_path = self.project_root / 'backend' / 'instance' / 'medication_tracker.db'
        if db_path.exists():
            size_mb = db_path.stat().st_size / (1024 * 1024)
            return {'size': round(size_mb, 2)}
        return {'size': 0}

    def monitor_system(self):
        while self.running:
            try:
                # System metrics
                self.metrics['system']['cpu'] = psutil.cpu_percent(interval=1)
                self.metrics['system']['memory'] = psutil.virtual_memory().percent
                self.metrics['system']['disk'] = psutil.disk_usage('/').percent

                # Backend metrics
                backend_proc = self.get_process_by_name('flask')
                if backend_proc:
                    self.metrics['backend']['cpu'] = backend_proc.cpu_percent()
                    self.metrics['backend']['memory'] = backend_proc.memory_percent()
                    self.metrics['backend']['status'] = 'running' if self.check_backend_health() else 'unhealthy'
                else:
                    self.metrics['backend']['status'] = 'stopped'

                # Frontend metrics
                frontend_proc = self.get_process_by_name('node')
                if frontend_proc:
                    self.metrics['frontend']['cpu'] = frontend_proc.cpu_percent()
                    self.metrics['frontend']['memory'] = frontend_proc.memory_percent()
                    self.metrics['frontend']['status'] = 'running' if self.check_frontend_health() else 'unhealthy'
                else:
                    self.metrics['frontend']['status'] = 'stopped'

                # Database metrics
                self.metrics['database'] = self.get_database_metrics()

                # Beta deployment metrics
                beta_status = self.monitor_beta_deployment()
                self.metrics['beta_deployment']['status'] = 'running' if all(service['status'] == 'running' for service in beta_status.values()) else 'unhealthy'
                for service, status in beta_status.items():
                    self.metrics['beta_deployment']['components_ready'][service] = status['status'] == 'running'

                self.display_metrics()
                time.sleep(2)

            except Exception as e:
                print(f"Error in monitoring: {str(e)}")
                time.sleep(5)

    def monitor_beta_deployment(self):
        """Monitor beta deployment services and their health status."""
        services = {
            'database': {
                'container': 'medminder_db_dev',
                'port': 5432,
                'health_check': 'pg_isready'
            },
            'backend': {
                'container': 'medminder_backend_dev',
                'port': 8000,
                'health_check': 'curl http://localhost:8000/health'
            },
            'frontend': {
                'container': 'medminder_frontend_dev',
                'port': 3000,
                'health_check': 'curl http://localhost:3000'
            },
            'redis': {
                'container': 'medminder_redis_dev',
                'port': 6379,
                'health_check': 'redis-cli ping'
            }
        }
        
        status = {}
        for service, config in services.items():
            try:
                container = self.client.containers.get(config['container'])
                status[service] = {
                    'status': container.status,
                    'health': container.attrs['State']['Health']['Status'],
                    'started_at': container.attrs['State']['StartedAt']
                }
            except Exception as e:
                status[service] = {
                    'status': 'not_found',
                    'error': str(e)
                }
        
        return status

    def display_metrics(self):
        os.system('cls' if os.name == 'nt' else 'clear')
        print(f"\n🔍 Medication Tracker Monitoring - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        # System Section
        print("\n🖥️  System Resources:")
        print(f"   CPU Usage: {self.metrics['system']['cpu']}%")
        print(f"   Memory Usage: {self.metrics['system']['memory']}%")
        print(f"   Disk Usage: {self.metrics['system']['disk']}%")

        # Backend Section
        print("\n🔧 Backend Service:")
        status_color = "🟢" if self.metrics['backend']['status'] == 'running' else "🔴"
        print(f"   Status: {status_color} {self.metrics['backend']['status']}")
        if self.metrics['backend']['status'] == 'running':
            print(f"   CPU Usage: {self.metrics['backend']['cpu']:.1f}%")
            print(f"   Memory Usage: {self.metrics['backend']['memory']:.1f}%")

        # Frontend Section
        print("\n🌐 Frontend Service:")
        status_color = "🟢" if self.metrics['frontend']['status'] == 'running' else "🔴"
        print(f"   Status: {status_color} {self.metrics['frontend']['status']}")
        if self.metrics['frontend']['status'] == 'running':
            print(f"   CPU Usage: {self.metrics['frontend']['cpu']:.1f}%")
            print(f"   Memory Usage: {self.metrics['frontend']['memory']:.1f}%")

        # Database Section
        print("\n💾 Database:")
        print(f"   Size: {self.metrics['database']['size']:.2f} MB")

        # Beta Deployment Section
        print("\n🚀 Beta Deployment:")
        print(f"   Status: {self.metrics['beta_deployment']['status']}")
        print(f"   Start Time: {self.metrics['beta_deployment']['start_time']}")
        print("   Components Ready:")
        for component, ready in self.metrics['beta_deployment']['components_ready'].items():
            status_color = "🟢" if ready else "🔴"
            print(f"     {component.capitalize()}: {status_color} {ready}")

        print("\nPress Ctrl+C to exit...")

    def start(self):
        try:
            monitor_thread = Thread(target=self.monitor_system)
            monitor_thread.start()
            monitor_thread.join()
        except KeyboardInterrupt:
            self.running = False
            print("\n\nStopping monitoring...")

if __name__ == "__main__":
    monitor = AppMonitor()
    monitor.start()
