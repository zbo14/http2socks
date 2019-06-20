#!/bin/bash -e

cd "$(dirname $0)"

chmod u+x http2socks

ln -s $PWD/http2socks /usr/local/bin
