ARG NODE_VERSION=26.13.0
FROM node:${NODE_VERSION}-alpine
WORKDIR /usr/app
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install
COPY . .
RUN DATABASE_URL=postgresql://bookify_user:bookify_pass@localhost:5432/bookify_db?schema=public yarn prisma generate
RUN yarn build
EXPOSE 3333
CMD yarn prisma migrate deploy && node dist/server.cjs