FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 6789

# Start command will be overridden in docker-compose for dev
CMD ["npm", "run", "build", "&&", "npm", "run", "preview"]
