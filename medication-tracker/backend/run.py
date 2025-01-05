from app import create_app
import logging
from flask import jsonify

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = create_app()

@app.route('/')
def home():
    return jsonify({"message": "Backend server is running"}), 200

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    
    # Print all registered routes
    print("\nRegistered Routes:")
    for rule in app.url_map.iter_rules():
        print(f"Path: {rule.rule}, Methods: {rule.methods}, Endpoint: {rule.endpoint}")
    
    app.run(host='0.0.0.0', port=5001, debug=True)