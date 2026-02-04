FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set Env to ensure access to backend (client-side calls hit localhost:8000 from browser)
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

# Run in dev mode
CMD ["npm", "run", "dev"]
