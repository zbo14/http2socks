#!/bin/bash -e

chmod u+x http2socks.js
cp http2socks.js /usr/bin/

cp http2socks.service /etc/systemd/system/

mkdir -p /etc/http2socks/
cp http2socks.conf /etc/https2socks/
