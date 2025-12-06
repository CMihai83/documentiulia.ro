#!/bin/bash
# Start ML Service

set -e

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Create directories
mkdir -p logs models

# Start the service
echo "Starting ML Service on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
