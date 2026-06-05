FROM node:20-alpine

WORKDIR /app

# Copy shared-ui package files first
COPY shared-ui/package*.json ./shared-ui/
RUN cd shared-ui && npm install

# Copy storefront package files
COPY storefront/package*.json ./storefront/
RUN cd storefront && npm install

# Copy all the rest of frontend files
COPY . .

# Expose Vite's default dev port
EXPOSE 5173

# Start dev server inside storefront
WORKDIR /app/storefront
CMD ["npm", "run", "dev", "--", "--host"]
