# pyright: strict

# Generates a python file that defines a Pydantic class based on a dataset from the CDISC API.

# IDEAS
# - Pydantic Fields can specify "exclude" to exclude the variable from the schema

import logging, jinja2, datetime, textwrap, json
from pathlib import Path
from typing import List
from dataclasses import dataclass

from cdisc_library_api_client.types import Unset
from cdisc_library_api_client.models.sdtmig_dataset import SdtmigDataset

from pinemarten.experimental.util import ensure

@dataclass
class OutputVariable:
    name: str
    python_type: str
    label: str
    description: str

def generate(ds: SdtmigDataset, out_path: Path | None) -> None:
    dataset_variables = ensure(ds.dataset_variables)
    
    last = 0
    out_vars: List[OutputVariable] = []
    for variable in dataset_variables:

        name = ensure(variable.name, msg=f'No name present for ordinal {variable.ordinal}.')
        ordinal = int(ensure(variable.ordinal, msg=f'No ordinal present for variable {name}'))

        if ordinal <= last:
            logging.warning('Dataset variables not processed in ordinal order: ' + str(variable.name))

        out_vars.append(OutputVariable(
            name=name.ljust(8),
            python_type= 'str' if variable.simple_datatype == 'Char' else 'Decimal',
            label = ensure(variable.label, default=str),
            description = ensure(variable.description, default=str)
        ))
        last = ordinal
    
    env = jinja2.Environment(loader=jinja2.FileSystemLoader('pinemarten/templates'))
    template = env.get_template('ds.py.jinja')
    output = template.render(
        generator={'name': __name__},
        input={'name': str(ds.name) + '.json'},
        output={'time': datetime.datetime.now()},
        dataset={
            'name': ds.name,
            'label': ds.label,
            'description':
                [] if isinstance(ds.description, Unset)
                else textwrap.fill(ds.description, width=72-4).split(sep='\n'),
            'dataset_structure':
                [] if isinstance(ds.dataset_structure, Unset)
                else textwrap.fill(ds.dataset_structure, width=72-4).split(sep='\n'),
            'variables': out_vars
        }
    )

    if out_path:
        
        with open(out_path / f'{str(ds.name)}.json', 'w') as f:
            json.dump(ds.to_dict(), f, indent=4)

        with open(out_path / f'{str(ds.name)}.py', 'w') as f:
            f.write(output)
            
    else:
        print(output)
