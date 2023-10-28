FROM node:21

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx next build

EXPOSE 3000
CMD [ "npx", "next", "start"]