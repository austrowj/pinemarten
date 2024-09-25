#pyright: strict
from typing import NewType, TypeVarTuple

Height = NewType('Height', int)
S = TypeVarTuple('S')

class Dataframe[*T]:
    columns: tuple[*T]

    def __init__(self, columns: tuple[*T]):
        self.columns = columns
    
    def join(self, df: 'Dataframe[*S]') -> 'Dataframe[*T, *S]':
        return Dataframe((*self.columns, *df.columns))

df = Dataframe((0, ''))
df2 = Dataframe((3.4, None))
df3 = df.join(df2)
