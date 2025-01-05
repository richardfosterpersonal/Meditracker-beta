from flask import Flask, Response

def init_security_headers(app: Flask) -> None:
    """Initialize security headers for the application"""
    
    @app.after_request
    def add_security_headers(response: Response) -> Response:
        # Enable HTTP Strict Transport Security (HSTS)
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Prevent browsers from performing MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Enable Cross-Site Scripting (XSS) filter
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'"
        )
        response.headers['Content-Security-Policy'] = csp
        
        # Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy
        response.headers['Permissions-Policy'] = (
            'camera=(), '
            'microphone=(), '
            'geolocation=()'
        )
        
        return response
