FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

# Run migrations and then start the application
CMD ["sh", "-c", "node migrate.js && node start.js"]
