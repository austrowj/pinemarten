datamodel-codegen `
    --input .\api\cdisc-library-api.json `
    --input-file-type openapi `
    --output .\pinemarten\schemas\cdisc_library_api_schema.py `
    --base-class pydantic_v2.BaseModel `
    --use-annotated `
    --reuse-model `
