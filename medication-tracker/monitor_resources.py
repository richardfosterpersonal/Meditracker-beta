import psutil
import time
import os
from datetime import datetime

def monitor_resources():
    print("\nSystem Resource Monitor")
    print("=" * 50)
    
    # CPU Usage
    cpu_percent = psutil.cpu_percent(interval=1)
    print(f"CPU Usage: {cpu_percent}%")
    
    # Memory Usage
    memory = psutil.virtual_memory()
    print(f"Memory Usage: {memory.percent}%")
    print(f"Available Memory: {memory.available / (1024 * 1024 * 1024):.2f} GB")
    
    # Disk Usage
    disk = psutil.disk_usage(os.getcwd())
    print(f"Disk Usage: {disk.percent}%")
    print(f"Free Disk Space: {disk.free / (1024 * 1024 * 1024):.2f} GB")
    
    # Process Information
    process = psutil.Process()
    print(f"\nProcess Memory Usage: {process.memory_info().rss / (1024 * 1024):.2f} MB")
    
    print("\nTop 5 Memory-Intensive Processes:")
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'memory_percent']):
        try:
            processes.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    processes.sort(key=lambda x: x['memory_percent'], reverse=True)
    for proc in processes[:5]:
        print(f"PID: {proc['pid']}, Name: {proc['name']}, Memory: {proc['memory_percent']:.2f}%")

if __name__ == "__main__":
    try:
        while True:
            monitor_resources()
            print(f"\nLast updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("\nPress Ctrl+C to exit...")
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
