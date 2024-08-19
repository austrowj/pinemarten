# pyright: strict

import json

from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_datasets
from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset
#from cdisc_library_api_client.api.sdtm_implementation_guide_sdtmig import api_products_sdtmig_get_dataset_variable

from cdisc_library_api_client.models.data_tabulation_dataset_list import DataTabulationDatasetList
from cdisc_library_api_client.models.data_tabulation_dataset_list_links import DataTabulationDatasetListLinks
from cdisc_library_api_client.models.sdtmig_dataset import SdtmigDataset

from cdisc_library_api_client.client import Client

def run():
    with open('api/config.json') as f:
        config = json.load(f)

    client = Client(
        base_url=config["url_root"],
        headers=config["headers"],
        verify_ssl=False#"/path/to/certificate_bundle.pem",
    )

    with client as client:
        dataset_data = api_products_sdtmig_get_datasets.sync(version="3-4", client=client)

        if not isinstance(dataset_data, DataTabulationDatasetList): return
        print(json.dumps(dataset_data.to_dict(), indent=4))

        if not isinstance(dataset_data.field_links, DataTabulationDatasetListLinks): return
        if not isinstance(dataset_data.field_links.datasets, list): return

        for i, dataset_link in enumerate(dataset_data.field_links.datasets):
            if i > 1: break
            print(dataset_link)
            if not isinstance(dataset_link.href, str): continue

            dataset_name = dataset_link.href.split('/')[-1]
            res = api_products_sdtmig_get_dataset.sync(version='3-4', dataset=dataset_name, client=client)

            if not isinstance(res, SdtmigDataset): continue
            print(json.dumps(res.to_dict(), indent=4))

        # or if you need more info (e.g. status_code)
        #response: Response[MyDataModel] = get_my_data_model.sync_detailed(client=client)
    
if __name__ == '__main__': run()
