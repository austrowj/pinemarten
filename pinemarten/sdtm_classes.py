# pyright: strict

# Idea: use jsonpickle for data persistence

from typing import List

class Study(object):
    """Models the study as a whole."""

    def __init__(self, id: str):
        self.id = id
        self.observations: List[Observation] = []

class Domain(object):
    """Class for representing observation domains."""
    def __init__(self, short_code: str):
        self.short_code = short_code

class Observation(object):
    """Models the common properties among the three general observation classes."""
    def __init__(self, domain: Domain):
        self.domain = domain

class Intervention(Observation):
    """The general observation class that represents treatment administrations, whether investigational, therapeutic, or otherwise."""
    pass

class Event(Observation):
    """The general observation class that represents protocol milestones and other planned or unplanned incidents."""
    pass

class Finding(Observation):
    """The general observation class that represents results and answers to questions."""
    pass

class FindingAbout(Finding):
    """The subtype of Findings that represents findings related to Interventions or Events."""
    pass
