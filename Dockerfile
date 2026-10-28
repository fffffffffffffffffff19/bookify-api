FROM node:22-alpine
WORKDIR /usr/app
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install
COPY . .
RUN npx prisma generate
RUN yarn build
EXPOSE 3333
CMD npx prisma migrate deploy && node dist/server.cjs