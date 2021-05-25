FROM node:12.18.4-alpine3.9 AS iotmyth-migration-backend-build
WORKDIR /root/
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000

CMD ["npm", "start"]