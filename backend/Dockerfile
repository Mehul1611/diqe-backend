FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for build (graphrag/llvmlite may need gcc)
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/ ./backend/
COPY llmcore/ ./llmcore/
# Copy models/output/plans (optional, but might be needed if pre-existing data)
# For now, we assume user mounts 'models' via volume if persistence needed.

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
