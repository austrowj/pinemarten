# pyright: strict

from typing import TypeVar
from cdisc_library_api_client.types import Unset

T = TypeVar('T')

def ensure(x: T | Unset | None, msg: str = '') -> T:

    if msg=='':
        msg = f'Object validation failed, expected {T}.'

    if x is None:
        raise Exception(msg + ' (was None)')
    if isinstance(x, Unset):
        raise Exception(msg + ' (was Unset)')
    
    return x
