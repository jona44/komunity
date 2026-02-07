import requests
import json

url = "http://127.0.0.1:8000/api/v1/auth-token/"
data = {
    "username": "manyadzatocky@gmail.com",
    "password": "wrong_password"
}
headers = {'Content-Type': 'application/json'}

response = requests.post(url, data=json.dumps(data), headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
