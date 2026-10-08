FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# The standalone app context retains the same relative shared-module imports.
COPY --from=order_workflow . /packages/order-workflow

EXPOSE 8080

CMD ["npm", "start"]
