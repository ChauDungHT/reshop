FROM node:20-alpine

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install all dependencies (including devDependencies like ts-node, nodemon)
RUN npm install

# Copy the rest of backend files
COPY . .

# Expose port
EXPOSE 8000

# Start in development mode
CMD ["npm", "run", "dev"]
