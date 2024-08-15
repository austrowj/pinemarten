
import requests, json, sys

with open('api/config.json') as f:
    config = json.load(f)

product = config['products'][sys.argv[1]]
endpoint = sys.argv[2]

request_url = config['url_root'] + product + endpoint

response = requests.get(
    request_url,
    headers = config['headers']
)

if len(sys.argv) > 3: # save bytes directly
    with open(sys.argv[3], 'wb') as f:
        f.write(response.content)
else:
    print(json.dumps(json.loads(response.content.decode('utf-8')), indent=4))
