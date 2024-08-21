# pyright: strict

import json, sys
import dataset_generator

from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_datasets
from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset
#from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset_variable

from cdisc_library_api_client.models.data_tabulation_dataset_list import DataTabulationDatasetList
from cdisc_library_api_client.models.data_tabulation_dataset_list_links import DataTabulationDatasetListLinks
from cdisc_library_api_client.models.sdtmig_dataset import SdtmigDataset

from cdisc_library_api_client.client import Client

import endpoint_hack

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

        # The dataset is valid; print to file if folder specified, otherwise to stdout.        
        if out_root:
            with open(f'{out_root}/datasets.json','w') as f:
                json.dump(dataset_data.to_dict(), f, indent=4)
        else:
            print(json.dumps(dataset_data.to_dict(), indent=4))


        if not isinstance(dataset_data.field_links, DataTabulationDatasetListLinks): return
        if not isinstance(dataset_data.field_links.datasets, list): return

        # Fetch the details of each dataset returned
        for i, dataset_link in enumerate(dataset_data.field_links.datasets):
            # but only the first two :)
            if i > 0: break
            print(dataset_link)

            # Another silent fail
            if not isinstance(dataset_link.href, str):
                print('href is not a str :<')
                continue

            # Trying out a pattern (hack) to extract endpoint arguments.
            # If we assume the type of object this link returns, we can parse the argument values out of its href.
            # Yes, we are using a private member function from the generated client. May end up regretting this later.
            parsed_args = endpoint_hack.parse_endpoint_arguments(
                dataset_link.href,
                api_products_sdtmig_get_dataset,
                'version', 'dataset'
            )

            # Make and "validate" the request
            res = api_products_sdtmig_get_dataset.sync(**parsed_args, client=client)
            if not isinstance(res, SdtmigDataset):
                print("res is not an SdtmigDataset :<")
                continue

            # Print the dataset info (optionally to file) if it's valid
            if out_root:
                with open(f'{out_root}/{parsed_args["dataset"]}.json','w') as f:
                    json.dump(res.to_dict(), f, indent=4)
            else:
                dataset_generator.generate(res, '')

        # Old code from the example, left here for reference

        # or if you need more info (e.g. status_code)
        #response: Response[MyDataModel] = get_my_data_model.sync_detailed(client=client)

if __name__ == '__main__': run(sys.argv[1] if len(sys.argv) > 1 else '')
