from typing import Any, Optional, Union, Dict, Tuple

class Result:
    fixed: Tuple[Any, ...]
    named: Dict[str, Any]

class Match:
    def evaluate_result(self) -> Result: ...

def parse(
    format: str,
    string: str,
    extra_types: Optional[Any] = None,
    evaluate_result: bool = True,
    case_sensitive: bool = False
) -> Union[Result, Match, None]: ...
