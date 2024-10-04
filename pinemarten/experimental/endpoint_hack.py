# Here be dragons
# pyright: strict
# pyright: reportUnknownMemberType = false
# pyright: reportAttributeAccessIssue = false
# pyright: reportPrivateUsage = false

# Alternative, safer concept:
# Each resource is uniquely identified by its endpoint, which is reliably available via the "self" link.
# So if we fetch resources in order of reverse granularity, we can index the linked resources by their endpoint.
# Using a different table for each resource type will retain type safety upon retrieval.
# Note that this requires two indexes: one to map endpoint IDs to tables, and another within each table.

from typing import Callable, Any
from parse import parse, Result

# Pass the actual href (that includes argument values), the client module for the endpoint, and the args needed.
# You get a dictionary of the arguments and their values that you can pass to that same module.
def parse_endpoint_arguments(url_literal: str, module: object, *args: str) -> dict[str, str]:

    # Assume that if "module" has this (private) function, it's a valid module from our API client and will function
    # as expected.
    if not hasattr(module, '_get_kwargs'):
        # Either it is not an endpoint or the client has changed out from under us.
        # If the latter happens, it's our fault really. Hope you can figure it out, future me! ¯\_(ツ)_/¯
        raise Exception(f'Module missing expected function _get_kwargs: {module}')
    
    if not isinstance(module._get_kwargs, Callable):
        raise Exception(f'Module has function _get_kwargs but it is not a function.')

    # Ask the API client module to form a "request url" with format strings for the variable values, then use that
    # "request" to extract the argument values from the given literal url.
    url_format: Any = module._get_kwargs(**{
        x: '{' + x + '}' for x in args
    })['url']
    if not isinstance(url_format, str):
        raise Exception(f'Function _get_kwargs exists but functioned differently than expected. Module: {module}')
    
    parsed = parse(url_format, url_literal)

    if not isinstance(parsed, Result): # None or Match means the parse pattern failed to find anything
        raise Exception(f'Attempted href parse failed. url_format: "{url_format}"; url_literal: "{url_literal}".')
    
    return parsed.named
