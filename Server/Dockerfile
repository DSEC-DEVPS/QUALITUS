FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/chargements
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh
EXPOSE 3000
CMD ["./wait-for-it.sh", "mysql:3306", "--", "npm", "run", "server"]
