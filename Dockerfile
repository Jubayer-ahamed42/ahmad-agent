FROM node:20-bullseye-slim

# Install system dependencies (ffmpeg for voice conversion, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package definition
COPY package*.json ./

# Install npm dependencies
RUN npm install --omit=dev

# Copy all project source files
COPY . .

# Expose default Hugging Face Spaces port
EXPOSE 7860
ENV PORT=7860
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

# Start Ahmad Executive AI Assistant
CMD ["node", "src/index.js"]
