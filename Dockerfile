FROM node:12.18.4-alpine3.9 AS iotmyth-ui-build
WORKDIR /usr/src/app
COPY front-end/ ./front-end/
RUN cd front-end && npm install @angular/cli && npm install && npm run build:prod

FROM node:12.18.4-alpine3.9 AS iotmyth-backend-build
WORKDIR /root/
COPY --from=iotmyth-ui-build /usr/src/app/front-end/dist ./front-end/dist
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3080

CMD ["npm", "start"]