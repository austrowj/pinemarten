# pyright: strict
# pyright: reportPrivateUsage = false

import json, sys

from parse import parse, Result

from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_datasets
from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset
#from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset_variable

from cdisc_library_api_client.models.data_tabulation_dataset_list import DataTabulationDatasetList
from cdisc_library_api_client.models.data_tabulation_dataset_list_links import DataTabulationDatasetListLinks
from cdisc_library_api_client.models.sdtmig_dataset import SdtmigDataset

from cdisc_library_api_client.client import Client

def run(out_root: str=''):

    # Set up connection with secret API info
    with open('api/config.json') as f:
        config = json.load(f)

    client = Client(
        base_url=config["url_root"],
        headers=config["headers"],
        verify_ssl=False#"/path/to/certificate_bundle.pem",
    )

    with client as client:
        # Obtains the list of all SDTMIG datasets for a hardcoded version.
        dataset_data = api_products_sdtmig_get_datasets.sync(version="3-4", client=client)

        # Silently do nothing if anything unexpected happens ¯\_(ツ)_/¯
        if not isinstance(dataset_data, DataTabulationDatasetList): return
        print(json.dumps(dataset_data.to_dict(), indent=4))

        if not isinstance(dataset_data.field_links, DataTabulationDatasetListLinks): return
        if not isinstance(dataset_data.field_links.datasets, list): return

        # Fetch the details of each dataset returned
        for i, dataset_link in enumerate(dataset_data.field_links.datasets):
            # but only the first two :)
            if i > 1: break
            print(dataset_link)

            # Another silent fail
            if not isinstance(dataset_link.href, str): continue

            # Trying out a pattern (hack) to extract endpoint arguments.
            # If we assume the type of object this link returns, we can parse the argument values out of its href.
            # Yes, we are using a private member function from the generated client. May end up regretting this later.
            url_format = api_products_sdtmig_get_dataset._get_kwargs(version=r'{version}', dataset=r'{dataset}')['url']
            parsed_args = parse_url_args(url_format, dataset_link.href)
            version, dataset = parsed_args['version'], parsed_args['dataset']

            # The actual request
            res = api_products_sdtmig_get_dataset.sync(version=version, dataset=dataset, client=client)

            # Print the dataset info (optionally to file) if it's valid
            if not isinstance(res, SdtmigDataset): continue

            if out_root:
                with open(f'{out_root}/{dataset}.json','w') as f:
                    json.dump(res.to_dict(), f, indent=4)
            else:
                print(json.dumps(res.to_dict(), indent=4))

        # Old code from the example, left here for reference

        # or if you need more info (e.g. status_code)
        #response: Response[MyDataModel] = get_my_data_model.sync_detailed(client=client)
    
# Parsing function to handle all the ways typing can get messed up.
# TODO: move this to its own module.
def parse_url_args(url_format: str, url_literal: str) -> dict[str, str]:
    parsed = parse(url_format, url_literal)
    if isinstance(parsed, Result):
        res = parsed.named
    else:
        res = {}
    
    return res

if __name__ == '__main__': run(sys.argv[1] if len(sys.argv) > 1 else '')
