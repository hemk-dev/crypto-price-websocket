FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

EXPOSE 5000
EXPOSE 8000

CMD ["npm", "start"]