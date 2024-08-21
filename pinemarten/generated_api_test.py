# pyright: strict

import json, sys
from pathlib import Path

from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_datasets
from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset
#from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset_variable

from cdisc_library_api_client.client import Client

import endpoint_hack, dataset_generator
from util import ensure

def run(version: str, out_root: str=''):

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
        dataset_data = api_products_sdtmig_get_datasets.sync(version=version, client=client)
        dataset_data = ensure(dataset_data)

        if out_root:
            out_path = Path(out_root, version)
            out_path.mkdir(parents=True, exist_ok=True)
        else:
            out_path = None

        # Print to file if folder specified, otherwise to stdout.        
        if out_path:
            with open(out_path / 'datasets.json', 'w') as f:
                json.dump(dataset_data.to_dict(), f, indent=4)
        else:
            print(json.dumps(dataset_data.to_dict(), indent=4))

        links = ensure(dataset_data.field_links)
        datasets = ensure(links.datasets)

        # Fetch the details of each dataset returned
        for i, dataset_link in enumerate(datasets):
            # but only for selected ones :)
            if i not in (0,1,2): continue

            print(dataset_link)
            href = ensure(dataset_link.href)

            # Trying out a pattern (hack) to extract endpoint arguments.
            # If we assume the type of object this link returns, we can parse the argument values out of its href.
            # Yes, we are using a private member function from the generated client. May end up regretting this later.
            parsed_args = endpoint_hack.parse_endpoint_arguments(
                href,
                api_products_sdtmig_get_dataset,
                'version', 'dataset'
            )

            # Make and validate the request
            res = api_products_sdtmig_get_dataset.sync(**parsed_args, client=client)
            res = ensure(res)

            # Print the dataset info (optionally to file) if it's valid
            dataset_generator.generate(res, out_path)

        # Old code from the example, left here for reference

        # or if you need more info (e.g. status_code)
        #response: Response[MyDataModel] = get_my_data_model.sync_detailed(client=client)

if __name__ == '__main__': run(sys.argv[1], *sys.argv[2:] if len(sys.argv) > 2 else '')
