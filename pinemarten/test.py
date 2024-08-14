
import requests, json, sys

with open('api/config.json') as f:
    config = json.load(f)

product = config['products'][sys.argv[1]]
endpoint = sys.argv[2]

response = requests.get(
    config['url_root'] + product + endpoint,
    headers = config['headers']
)
print(json.dumps(json.loads(response.content.decode('utf-8')), indent=4))
