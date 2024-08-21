# pinemarten

Will serve as our implementation of CDISC standards.

## Notes

API schema is formatted through JSONSchema, which codegen understands natively.
Need to find how to pull the full definition though.
The copy extracted from the webapp is already partially processed.

### XPORT

Even though xport claims it """requires""" pandas<1.4, it works perfectly fine with modern pandas.
So we have to circumvent the dependency ourselves.
This library hasn't been updated in over two years.
