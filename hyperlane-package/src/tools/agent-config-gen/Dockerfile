FROM node:20-bullseye
WORKDIR /app
COPY package.json index.js ./
RUN npm ci || npm i
ENTRYPOINT ["node","/app/index.js"]
