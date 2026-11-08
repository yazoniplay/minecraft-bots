FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY config/example.json ./config/example.json

CMD ["node", "src/index.js"]
