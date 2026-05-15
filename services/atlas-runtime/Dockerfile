FROM python:3.13-slim

# Node.js 20 for GitHub MCP server (npx @modelcontextprotocol/server-github)
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Pre-install MCP servers so cold starts don't hit npm network
RUN npm install -g @modelcontextprotocol/server-github @stripe/mcp

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY agents/ agents/

ENV PORT=8080
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
