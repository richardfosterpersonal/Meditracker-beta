from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)

@app.route('/api/test', methods=['GET'])
def test():
    return {"message": "Server is working"}

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    return {"message": "Login endpoint is working"}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
