# pinemarten

An (extremely rough) exploration of static verification for CDISC data transformations.
The big picture is to enable writing and validating the SDTM -> ADaM leg of the ETL pipeline up front, even before any data is collected.
Maybe this could lead to some interesting applications in AI coding workflows.

The project has two (currently independent) arms:
1) General type-safe data transformation using typescript.
You write your data transforms as ```.ts``` files and the compiler turns it into executable R code.
3) Static verification of valid CDISC SDTM/ADaM schemas using python.

The typescript section is the far more developed of the two and contains:
1) Implementations of basic ```select```, ```mutate```, ```join```, ```filter```, and ```group by``` as type lambdas (```pinemarten-ts/src/api/schema_operations.ts```).
2) DataFrame API that uses the type lambdas to statically check operations and provide autocomplete (```pinemarten-ts/src/api/language.ts```).
3) Typescript-to-R compiler (```pinemarten-ts/src/compiler/*```).
4) Example programs that compile to valid R code (```pinemarten-ts/test_programs/*.R.ts```).
You can try editing these, and if you change a column name or type to be invalid, you should see the typescript LSP complain about it.

The python section houses the start of an attempt at some definitions for CDISC concepts using the CDISC API.
The scripts in ```python_package/scripts``` generate a client for the API and pydantic models for the API objects, respectively.
This gets you autocomplete on the CDISC ontology, which in principle would let you build a DSL for creating schemas that are forced to be valid by construction.
