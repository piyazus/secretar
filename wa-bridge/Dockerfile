FROM node:20-alpine
# git нужен npm: у Baileys есть зависимость с GitHub (libsignal)
RUN apk add --no-cache git
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.js ./
EXPOSE 3080
CMD ["node", "index.js"]
