# Stage 1: Build Client
FROM node:20-alpine as client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --production
COPY server/ ./
# Create the directory structure expected by the server
RUN mkdir -p ../client/dist
COPY --from=client-build /app/client/dist ../client/dist

EXPOSE 3000
CMD ["node", "index.js"]
