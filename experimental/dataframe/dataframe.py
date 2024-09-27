#pyright: strict
from dataclasses import dataclass
from typing import List, Optional
from abc import ABC, abstractmethod

type ColumnType = int | str

class DfColumn[T: ColumnType]:
    pass

@dataclass
class Dataframe:
    car: Optional[DfColumn[ColumnType]]
    cdr: Optional['Dataframe']

class Operation(ABC):
    @abstractmethod
    def execute(self) -> Dataframe:
        pass

class Select(Operation):
    cols: List[DfColumn[ColumnType]]

    def __init__(self, *args: DfColumn[ColumnType]):
        self.cols = list(args)

    def execute(self) -> Dataframe:
        return Dataframe(self.cols[0], Select(*self.cols[1:]).execute())

class Filter(Operation):
    df: Dataframe
    conditions: List[str]

    def __init__(self, df: Dataframe, *args: str):
        self.df = df
        self.conditions = list(args)
    
    def execute(self):
        return self.df
