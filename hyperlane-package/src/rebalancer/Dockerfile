FROM node:20-bullseye
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci || npm i
COPY src ./src
RUN npm run build
EXPOSE 8080
CMD ["node","dist/index.js"]
