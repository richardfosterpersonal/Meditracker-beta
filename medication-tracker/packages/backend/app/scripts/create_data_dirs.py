"""Create required data directories"""
import os

def create_dirs():
    """Create data directories"""
    dirs = [
        "data",
        "data/beta",
    ]
    
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        print(f"Created directory: {d}")

if __name__ == "__main__":
    create_dirs()
