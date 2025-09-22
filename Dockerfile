# Use Node.js as the base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json (if you don’t have one yet, we’ll create it later)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port 80 (will be mapped by docker-compose)
EXPOSE 80

# Start the server
CMD ["node", "server.js"]