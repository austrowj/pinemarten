from typing import List, Optional, Literal

class Study(object):
    def __init__(self, id: str):
        self.id: str = id
        self.observations: List[Observation] = []

class Observation(object):
    def __init__(self):
        self.domain: Literal[None] = None
        pass

class Intervention(Observation):
    pass

class Event(Observation):
    pass

class Finding(Observation):
    pass

