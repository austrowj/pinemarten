# pyright: strict

import logging, json
from typing import TypeVar, Callable
from cdisc_library_api_client.types import Unset
from cdisc_library_api_client.models.error import Error

T = TypeVar('T')

def ensure(x: T | Unset | Error | None,
           msg: str = 'Object validation failed.',
           default: Callable[[],T] | None = None) -> T:

    # Exhaustively check every possibility

    if isinstance(x, Unset):
        msg = msg + ' (was Unset)'

    elif isinstance(x, Error):
        msg = msg + f'\n Error: {json.dumps(x.to_dict(), indent=4)}'

    elif x is None:
        msg = msg + ' (was None)'
    
    else:
        return x

    # We've failed, check if recovery was specified
    if default is not None:
        logging.info('Validation issue resulted in use of default value. Validation failure message:\n' + msg)
        return default()
    
    # No other option
    raise Exception(msg)
