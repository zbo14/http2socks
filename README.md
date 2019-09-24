# http2socks

An HTTP proxy that routes traffic through [socksproxy](https://github.com/zbo14/socksproxy).

Intended for clients that don't support SOCKS.

## Install

Clone the repo and `sudo sh install.sh`.

### For development

Install [nvm](https://github.com/nvm-sh/nvm#installation-and-update) if you haven't already.

Then `nvm i` and `npm i`.

## Usage

`http2socks` is a systemd service so you can use `systemctl` commands.

### Start

`sudo systemctl start http2socks`

### Stop

`sudo systemctl stop http2socks`

### View logs

`sudo journalctl -u http2socks`

### Config

The config file `/etc/http2socks/http2socks.conf` contains the following:

```sh
## The port the HTTP proxy listens on
HTTP_PORT=17898

## The address of the socksproxy instance
SOCKS_HOST="127.0.0.1"

## The port socksproxy is listening on
SOCKS_PORT=17897
```

## Test

`npm test`

Run the unit tests for the HTTP proxy.

## Lint

`npm lint`

Lint the source and test files.

## Documentation

`npm run doc`

Generate the code documentation and open in browser.

## Contributing

Please do!

If you find a bug, think of an enhancement, or just have a question, feel free to [open an issue](https://github.com/zbo14/http2socks/issues/new). You're also welcome to [create a pull request](https://github.com/zbo14/http2socks/compare/develop...) addressing an issue. You should push your changes to a feature branch and request merge to `develop`.

Make sure linting/tests pass and coverage is 💯 before creating a pull request!
