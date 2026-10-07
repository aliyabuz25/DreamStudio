FROM node:20-alpine

# better-sqlite3 ve bcryptjs için native build araçları
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]