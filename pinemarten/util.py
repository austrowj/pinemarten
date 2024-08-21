# pyright: strict

import json
from typing import TypeVar
from cdisc_library_api_client.types import Unset
from cdisc_library_api_client.models.error import Error

T = TypeVar('T')

def ensure(x: T | Unset | Error | None, msg: str = '') -> T:

    if msg=='':
        msg = f'Object validation failed.'

    if isinstance(x, Unset):
        raise Exception(msg + ' (was Unset)')
    if isinstance(x, Error):
        raise Exception(msg + f'\n Error: {json.dumps(x.to_dict(), indent=4)}')
    if x is None:
        raise Exception(msg + ' (was None)')
    
    return x
