# pyright: strict

# Idea: use jsonpickle for data persistence

from typing import List, Literal, Optional
from dataclasses import dataclass

@dataclass
class Column(object):
    """Representation of a column in the final dataset."""
    name: str
    label = ''
    type = 'char'
    format = ''

@dataclass
class Domain(object):
    """Class for representing observation domains."""
    short_code:str

@dataclass
class Observation(object):
    """Models the common properties among the three general observation classes."""
    
    class Target(object):
        """Abstracts the observation identifier fields."""
    
    @dataclass
    class Topic(object):
        """Holds possible observation topics."""
    
    class Timing(object):
        """Holds standard timing information."""

    domain: Domain
    target: Target
    topic: Optional[Topic]
    timing: Optional[Timing]

@dataclass
class Intervention(Observation):
    """The general observation class that represents treatment administrations, whether investigational, therapeutic, or otherwise."""

    @dataclass
    class Topic(Observation.Topic):
        name: str
        modified_name: Optional[str]
        standard_name: Optional[str]
        pre_specified: Optional[Literal['Y']]

class Event(Observation):
    """The general observation class that represents protocol milestones and other planned or unplanned incidents."""

class Finding(Observation):
    """The general observation class that represents results and answers to questions."""

class FindingAbout(Finding):
    """The subtype of Findings that represents findings related to Interventions or Events."""

@dataclass
class Study(object):
    """Models the study as a whole."""
    id: str
    observations: List[Observation] = []
