#!/bin/bash -e

cd "$(dirname $0)"

chmod u+x httpproxy

ln -s $PWD/httpproxy /usr/local/bin
