FROM node:10.16.0-alpine

COPY . /

RUN apk update && \
    apk upgrade && \
    adduser -D http2socks

USER http2socks

ENTRYPOINT \
  HTTP_PORT=$HTTP_PORT \
  SOCKS_HOST=$SOCKS_HOST \
  SOCKS_PORT=$SOCKS_PORT \
  sh entrypoint.sh
