FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/chargements
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh
EXPOSE 3000
# out113 : demarrer.js (WEB_CONCURRENCY processus ; 1 par défaut = comme avant)
CMD ["./wait-for-it.sh", "db:3306", "--", "node", "demarrer.js"]
