from flask import Flask, jsonify, request
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all routes
    CORS(app, 
         origins="http://localhost:3000",
         allow_credentials=True,
         supports_credentials=True,
         expose_headers=["Content-Type", "Authorization"],
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    
    @app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
    def login():
        if request.method == 'OPTIONS':
            return '', 204
        return jsonify({"message": "Login successful"}), 200
    
    @app.route('/api/test', methods=['GET'])
    def test():
        return jsonify({"message": "Server is working"}), 200
        
    return app

if __name__ == '__main__':
    app = create_app()
    print("Starting server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
