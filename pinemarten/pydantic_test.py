# pyright: strict

import json, sys
from schemas import cm_variables as cm

x = cm.Model.model_validate(json.load(open(sys.argv[1])))

for y in x.field_links.datasetVariables:
    print(f"{y.href.split('/')[-1]}\t{y.title}")

#print(x.model_dump_json(indent=4))
