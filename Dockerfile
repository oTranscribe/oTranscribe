FROM node:10-alpine

RUN apk add git make

RUN npm install --global serve

ADD ./ ./app

WORKDIR ./app

RUN npm install --ignore-engines

RUN make build_prod

CMD [ "serve", "dist" ]
