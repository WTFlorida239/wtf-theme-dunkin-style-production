#!/usr/bin/env python3
"""
Simple HTTP server for testing WTF Theme functionality
Serves the test-theme.html file and all assets
"""

import http.server
import socketserver
import os
import mimetypes
import sys
from urllib.parse import urlparse
import json

class WTFThemeHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for WTF Theme testing"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="/home/user/webapp", **kwargs)
    
    def do_GET(self):
        """Handle GET requests with proper MIME types and routing"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Route root to test page
        if path == '/':
            self.path = '/test-theme.html'
        
        # Set proper MIME types for assets
        if path.endswith('.js'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            
            try:
                with open(f"/home/user/webapp{path}", 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404, f"File not found: {path}")
            return
        
        elif path.endswith('.css'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/css')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            
            try:
                with open(f"/home/user/webapp{path}", 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404, f"File not found: {path}")
            return
        
        # Mock Shopify cart endpoints for testing
        elif path == '/cart/add.js':
            self.handle_cart_add()
            return
        
        elif path == '/cart.js':
            self.handle_cart_get()
            return
        
        # Default handling for other files
        super().do_GET()
    
    def do_POST(self):
        """Handle POST requests for cart operations"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/cart/add.js':
            self.handle_cart_add()
        else:
            self.send_error(404, f"POST endpoint not found: {path}")
    
    def handle_cart_add(self):
        """Mock cart add endpoint for testing"""
        try:
            # Get the form data
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Mock successful response
            response_data = {
                "id": 123456789,
                "variant_id": 123,
                "title": "Custom Kratom Tea - Medium",
                "price": 900,
                "quantity": 1,
                "properties": {
                    "Size": "Medium",
                    "Strain": "Green + Red",
                    "Flavors": "Vanilla (2 pumps), Caramel (1 pump)",
                    "Sweeteners": "Stevia",
                    "Creamers": "Oat Milk"
                }
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(response_data).encode())
            
        except Exception as e:
            # Mock error response
            error_data = {
                "description": "This is a test environment. Cart functionality is mocked.",
                "message": str(e)
            }
            
            self.send_response(422)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(error_data).encode())
    
    def handle_cart_get(self):
        """Mock cart get endpoint for testing"""
        response_data = {
            "token": "test-cart-token",
            "note": "",
            "attributes": {},
            "total_price": 900,
            "total_weight": 0,
            "item_count": 1,
            "items": [
                {
                    "id": 123456789,
                    "variant_id": 123,
                    "title": "Custom Kratom Tea - Medium",
                    "price": 900,
                    "quantity": 1,
                    "properties": {
                        "Size": "Medium",
                        "Strain": "Green + Red",
                        "Flavors": "Vanilla (2 pumps), Caramel (1 pump)",
                        "Sweeteners": "Stevia",
                        "Creamers": "Oat Milk"
                    }
                }
            ]
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        self.wfile.write(json.dumps(response_data).encode())
    
    def log_message(self, format, *args):
        """Override to provide cleaner logging"""
        sys.stdout.write(f"{self.log_date_time_string()} - {format % args}\n")
        sys.stdout.flush()

def main():
    PORT = 8000
    
    print(f"🎉 WTF Theme Testing Server")
    print(f"📍 Serving from: /home/user/webapp")
    print(f"🌐 Server starting on port {PORT}")
    print(f"🔗 Access at: http://0.0.0.0:{PORT}")
    print(f"📝 Test page: http://0.0.0.0:{PORT}/test-theme.html")
    print(f"🛑 Press Ctrl+C to stop")
    print("=" * 50)
    
    with socketserver.TCPServer(("0.0.0.0", PORT), WTFThemeHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
        except Exception as e:
            print(f"❌ Server error: {e}")

if __name__ == "__main__":
    main()