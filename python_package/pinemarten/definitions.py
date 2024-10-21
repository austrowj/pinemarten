#pyright: strict
from dataclasses import dataclass

@dataclass
class CdiscColumn:
    label: str = ''
    is_identifier: bool = False

class Predecessor(CdiscColumn):

    source_column: CdiscColumn

    def __init__(self, source_column: CdiscColumn | str):
        if isinstance(source_column, str):
            raise TypeError('Source column incorrectly passed as string.')
        #super().__init__(source.label, source.is_identifier)
        self.source_column = source_column
        self.__dict__.update(source_column.__dict__)
    
    #def __set_name__(self, owner: object, name: str):
    #    CdiscColumn.__set_name__(self, owner, name)
    