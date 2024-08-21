# pyright: strict

# Generates a python file that defines a Pydantic class based on a dataset from the CDISC API.

import logging, jinja2, datetime
from dataclasses import dataclass
from typing import List

from cdisc_library_api_client.types import Unset
from cdisc_library_api_client.models.sdtmig_dataset import SdtmigDataset
#from cdisc_library_api_client.models.ig_variable_attributes import IgVariableAttributes

@dataclass
class OutputVariable:
    name: str
    python_type: str

def generate(ds: SdtmigDataset, output_root: str) -> None:
    if isinstance(ds.dataset_variables, Unset):
        raise Exception('Dataset does not have variable attributes set.')
    
    last = 0
    out_vars: List[OutputVariable] = []
    for variable in ds.dataset_variables:
        if isinstance(variable.ordinal, Unset):
            raise Exception('Variable does not have an ordinal value: ' + str(variable.name))
        if isinstance(variable.name, Unset):
            raise Exception('Variable does not have a name: ' + str(variable.name))
        
        ordinal = int(variable.ordinal)
        if ordinal <= last:
            logging.warning('Dataset variables not processed in ordinal order: ' + str(variable.name))

        out_vars.append(OutputVariable(
            name=variable.name.ljust(8),
            python_type= 'str' if variable.simple_datatype == 'Char' else 'float'
        ))
        last = ordinal
    
    env = jinja2.Environment(loader=jinja2.FileSystemLoader('pinemarten/templates'))
    template = env.get_template('ds.py.jinja')
    print(template.render(
        generator={'name': __name__},
        input={'name': str(ds.name) + '.json'},
        output={'time': datetime.datetime.now()},
        dataset={'name': ds.name, 'variables': out_vars}
    ))
