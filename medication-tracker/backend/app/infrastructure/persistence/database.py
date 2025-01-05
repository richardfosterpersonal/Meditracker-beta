from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager
import os

class Database:
    def __init__(self):
        self.engine = create_engine(os.getenv('DATABASE_URL', 'sqlite:///instance/medication_tracker.db'))
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.session = scoped_session(self.SessionLocal)
        self.Base = declarative_base()

    def get_db(self):
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    @contextmanager
    def session_scope(self):
        """Provide a transactional scope around a series of operations."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except:
            session.rollback()
            raise
        finally:
            session.close()

    def create_all(self):
        """Create all tables."""
        self.Base.metadata.create_all(bind=self.engine)

    def drop_all(self):
        """Drop all tables."""
        self.Base.metadata.drop_all(bind=self.engine)

# Create a database instance
db = Database()

# Dependency to get database session
def get_db():
    return next(db.get_db())
