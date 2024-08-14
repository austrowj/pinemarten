
import requests, json, sys

with open('api/config.json') as f:
    config = json.load(f)

endpoint = sys.argv[1]

response = requests.get(
    config['url_root'] + config['product'] + endpoint,
    headers = config['headers']
)
print(json.dumps(json.loads(response.content.decode('utf-8')), indent=4))
