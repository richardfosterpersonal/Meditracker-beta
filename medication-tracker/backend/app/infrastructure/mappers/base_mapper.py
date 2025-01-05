from abc import ABC, abstractmethod
from typing import TypeVar, Generic

EntityT = TypeVar('EntityT')
ModelT = TypeVar('ModelT')

class BaseMapper(Generic[EntityT, ModelT], ABC):
    @abstractmethod
    def to_entity(self, model: ModelT) -> EntityT:
        """Convert a database model to a domain entity"""
        pass

    @abstractmethod
    def to_model(self, entity: EntityT) -> ModelT:
        """Convert a domain entity to a database model"""
        pass
