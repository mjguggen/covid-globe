FROM node:16

ENV MONGO_URI=""
ENV GITHUB_PAT=""
ENV PORT=8080
ENV CLIENT=http://localhost:3000

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE ${PORT}
CMD [ "npm", "start" ]