FROM node:10.16.0-alpine

COPY . /

RUN apk update && \
    apk upgrade && \
    adduser -D httpproxy

USER httpproxy

ENTRYPOINT \
  HTTP_PORT=$HTTP_PORT \
  SOCKS_HOST=$SOCKS_HOST \
  SOCKS_PORT=$SOCKS_PORT \
  sh entrypoint.sh
