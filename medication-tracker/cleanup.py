import os
import shutil
import subprocess
from pathlib import Path

def run_command(command, cwd=None):
    try:
        result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print(f"✅ Success: {command}")
            if result.stdout.strip():
                print(result.stdout.strip())
        else:
            print(f"❌ Error in {command}:")
            print(result.stderr.strip())
    except Exception as e:
        print(f"❌ Failed to run {command}: {str(e)}")

def cleanup_project():
    project_root = Path(__file__).parent
    print("\n🧹 Starting project cleanup...\n")

    # Directories to clean up
    cleanup_dirs = [
        "**/__pycache__",
        "**/.pytest_cache",
        "**/.coverage",
        "**/node_modules",
        "**/build",
        "**/dist",
        "**/.next",
        "**/.cache",
        "**/coverage"
    ]

    # Files to clean up
    cleanup_files = [
        "**/*.pyc",
        "**/*.pyo",
        "**/*.pyd",
        "**/.DS_Store",
        "**/.env.local",
        "**/.eslintcache",
        "**/*.log"
    ]

    # Clean Python cache and temp files
    print("🐍 Cleaning Python cache files...")
    for pattern in cleanup_dirs + cleanup_files:
        for item in project_root.glob(pattern):
            try:
                if item.is_file():
                    item.unlink()
                    print(f"Deleted file: {item}")
                elif item.is_dir():
                    shutil.rmtree(item)
                    print(f"Deleted directory: {item}")
            except Exception as e:
                print(f"Failed to delete {item}: {str(e)}")

    # Git cleanup
    print("\n🔄 Optimizing Git repository...")
    git_commands = [
        "git gc --aggressive --prune=now",
        "git clean -xfd",  # Clean untracked files
        "git reset --hard",  # Reset any uncommitted changes
    ]
    for cmd in git_commands:
        run_command(cmd, project_root)

    # Recreate virtual environment
    print("\n🔧 Rebuilding Python virtual environment...")
    backend_dir = project_root / "backend"
    venv_dir = backend_dir / "venv"
    if venv_dir.exists():
        shutil.rmtree(venv_dir)
    run_command("python -m venv venv", backend_dir)
    run_command("venv\\Scripts\\pip install -r requirements.txt", backend_dir)

    # Reinstall node modules
    print("\n📦 Rebuilding Node modules...")
    frontend_dir = project_root / "frontend"
    if (frontend_dir / "package.json").exists():
        run_command("npm ci", frontend_dir)  # Uses package-lock.json for exact versions

    print("\n✨ Cleanup complete! Your development environment has been reset to a clean state.")

if __name__ == "__main__":
    try:
        cleanup_project()
    except KeyboardInterrupt:
        print("\n\n⚠️ Cleanup interrupted by user")
    except Exception as e:
        print(f"\n\n❌ An error occurred: {str(e)}")
    finally:
        input("\nPress Enter to exit...")
