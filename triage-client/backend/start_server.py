"""
Startup script for the Medical Diagnosis API server.
"""

import subprocess
import sys
import os

def check_dependencies():
    """Check if required packages are installed."""
    required_packages = ['fastapi', 'uvicorn', 'pydantic']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"Missing required packages: {', '.join(missing_packages)}")
        print("Install them with:")
        print(f"   pip install {' '.join(missing_packages)}")
        return False
    
    return True

def start_server(port=8000, reload=True):
    """Start the FastAPI server."""
    if not check_dependencies():
        sys.exit(1)
    
    print("Starting Medical Diagnosis API Server...")
    print(f"Server will be available at: http://localhost:{port}")
    print("API documentation at: http://localhost:{port}/docs")
    print("Interactive docs at: http://localhost:{port}/redoc")
    print("\n" + "="*50)
    
    cmd = [
        sys.executable, "-m", "uvicorn", 
        "medical_api:app", 
        "--port", str(port),
        "--host", "0.0.0.0"
    ]
    
    if reload:
        cmd.append("--reload")
    
    try:
        subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Start Medical Diagnosis API Server")
    parser.add_argument("--port", "-p", type=int, default=8000, help="Port to run server on")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    
    args = parser.parse_args()
    
    start_server(port=args.port, reload=not args.no_reload)