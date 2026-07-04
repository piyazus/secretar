# Контекст сборки — корень репозитория (см. infra/docker-compose.yml):
# lib/ лежит рядом с frontend/ и нужен приложению (@lib/* в tsconfig).
FROM node:20-alpine AS base
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY lib /app/lib
COPY frontend .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
