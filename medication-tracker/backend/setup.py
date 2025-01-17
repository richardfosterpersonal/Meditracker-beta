from setuptools import setup, find_packages

setup(
    name="medication_tracker",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.68.0",
        "pydantic>=2.5.0",
        "pydantic-settings>=2.1.0",
        "python-dotenv>=0.19.0",
        "uvicorn>=0.15.0",
        "sqlalchemy>=1.4.23",
        "alembic>=1.7.1",
        "python-jose[cryptography]>=3.3.0",
        "passlib[bcrypt]>=1.7.4",
        "python-multipart>=0.0.5",
        "aiohttp>=3.8.0",
        "pytest>=6.2.5",
        "pytest-asyncio>=0.15.1",
    ],
    python_requires=">=3.8",
)
