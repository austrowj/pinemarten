# pyright: strict

import requests, json, sys

with open('api/config.json') as f:
    config = json.load(f)

def get(href: str) -> requests.Response:
    response = requests.get(
        config['url_root'] + href,
        headers = config['headers']
    )
    return response

if __name__ == '__main__':

    product: str = config['products'][sys.argv[1]]
    endpoint = sys.argv[2]
    response = get(product + endpoint)

    if len(sys.argv) > 3: # save bytes directly
        with open(sys.argv[3], 'wb') as f:
            f.write(response.content)
    else:
        print(json.dumps(json.loads(response.content.decode('utf-8')), indent=4))
