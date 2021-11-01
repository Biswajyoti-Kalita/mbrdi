FROM node:12
WORKDIR /app
COPY package*.json ./

RUN npm install
COPY /app
Expose 8080
CMD ["npm", "start"]