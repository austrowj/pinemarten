# pinemarten

An (extremely rough) exploration of static verification for CDISC data transformations.
The big picture is to enable writing and validating the SDTM -> ADaM leg of the ETL pipeline up front, even before any data is collected.
Maybe this could lead to some interesting applications in AI coding workflows.

The project has two (currently independent) arms:
1) General type-safe data transformation using typescript.
2) Static verification of valid CDISC SDTM/ADaM schemas using python.

In the typescript section:
1) Implementations of basic ```select```, ```mutate```, ```join```, and ```filter``` as type lambdas (```pinemarten-ts/src/schema_operations.ts```).
2) DataFrame API that provides static type verification and column name autocomplete, while building the appropriate R AST in the background (```pinemarten-ts/src/rlang/dataframe.ts```).
3) Rudimentary AST printer that outputs valid R code (```pinemarten-ts/src/rlang/ast.ts```).

The python section houses the start of an attempt at some definitions for CDISC concepts using the CDISC API.
The scripts in ```python_package/scripts``` generate a client for the API and pydantic models for the API objects, respectively.
This gets you autocomplete on the CDISC ontology, which in principle would let you build a DSL for creating schemas that are forced to be valid by construction.
