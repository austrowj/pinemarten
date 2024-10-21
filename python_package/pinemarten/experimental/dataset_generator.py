# pyright: strict

# Generates a python file that defines a Pydantic class based on a dataset from the CDISC API.

# IDEAS
# - Pydantic Fields can specify "exclude" to exclude the variable from the schema

from typing import Any
import jinja2, datetime, textwrap, json
from pathlib import Path
from dataclasses import dataclass

from cdisc_library_api_client.types import Unset
from cdisc_library_api_client.models.sdtmig_dataset import SdtmigDataset

from pinemarten.experimental.util import ensure

@dataclass
class OutputVariable:
    # So originally the plan was to produce python code.
    # But plans change, so I just grafted on the typescript stuff.
    name: str
    python_type: str
    ts_type: str
    sql_type: str
    properties: dict[str, Any]
    description: list[str]

@dataclass
class OutputType:
    name: str
    description: str
    variables: list[OutputVariable]

def generate(ds: SdtmigDataset, out_path: Path | None, test_run: bool = True) -> None:
    dataset_variables = ensure(ds.dataset_variables)
    
    out_types = {
        'Req': OutputType('Required', 'Required variables', []),
        'Exp': OutputType('Expected', 'Expected variables', []),
        'Perm': OutputType('Permissible', 'Permissible variables', []),
        'Cond': OutputType('ConditionallyRequired', 'Conditionally-required variables', []),
        '': OutputType('Uncategorized', 'Variables with unimplemented requirements (this should be empty)', [])
    }
    for i, variable in enumerate(dataset_variables):
        if test_run and i > 3: pass

        name = ensure(variable.name, msg=f'No name present for ordinal {variable.ordinal}.')

        core = ensure(variable.core, default=str)
        out_types[ core if core in out_types.keys() else ''].variables.append(OutputVariable(
            name = name,
            python_type =
                'str' if variable.simple_datatype == 'Char'
                else 'Decimal',
            ts_type =
                'string' if variable.simple_datatype == 'Char'
                else 'number',
            sql_type =
                'text' if variable.simple_datatype == 'Char'
                else 'real',
            description =
                [] if isinstance(variable.description, Unset)
                else textwrap.fill(variable.description, width=72-4).split(sep='\n'),
            properties = variable.to_dict()
        ))
    
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader('pinemarten/templates'),
        trim_blocks=True,
        lstrip_blocks=True
    )
    template = env.get_template('schema.ts.jinja')
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
            'types': out_types
        }
    )

    if out_path:
        
        with open(out_path / f'{str(ds.name)}.json', 'w') as f:
            json.dump(ds.to_dict(), f, indent=4)

        with open(out_path / f'{str(ds.name)}.ts', 'w') as f:
            f.write(output)
            
    else:
        print(output)
