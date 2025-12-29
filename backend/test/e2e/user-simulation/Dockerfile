# DocumentIulia.ro Platform User Simulation - Docker Container
# For CI/CD integration (GitHub Actions, Jenkins)

FROM python:3.11-slim

# Install Chrome for Selenium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver
RUN CHROME_VERSION=$(google-chrome --version | grep -oE "[0-9]+\.[0-9]+\.[0-9]+") \
    && wget -q "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION%%.*}" -O /tmp/chromedriver_version \
    && DRIVER_VERSION=$(cat /tmp/chromedriver_version) \
    && wget -q "https://chromedriver.storage.googleapis.com/${DRIVER_VERSION}/chromedriver_linux64.zip" -O /tmp/chromedriver.zip \
    && unzip /tmp/chromedriver.zip -d /usr/local/bin/ \
    && rm /tmp/chromedriver.zip /tmp/chromedriver_version \
    && chmod +x /usr/local/bin/chromedriver

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy test scripts
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV DISPLAY=:99

# Default command
ENTRYPOINT ["python", "platform_user_simulator.py"]
CMD ["--env", "staging", "--headless", "--report-format", "html"]
