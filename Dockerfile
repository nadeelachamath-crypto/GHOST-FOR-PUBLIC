# Use the official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files first to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the source code
COPY . .

# If you use .env files, make sure to copy it or use Docker secrets/volumes in production

# Expose port (only if your bot uses HTTP server, e.g., for webhook)
EXPOSE 3000

# Default command to run your bot
CMD ["node", "index.js"]
