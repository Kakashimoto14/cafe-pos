FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/ui-kit/package.json ./packages/ui-kit/package.json

RUN npm install

COPY apps/frontend ./apps/frontend
COPY packages ./packages

WORKDIR /app/apps/frontend

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
