FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

# HTTP + WebSocket (/ws) on the same port as PORT
EXPOSE 5000

CMD ["npm", "start"]