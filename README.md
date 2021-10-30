# Swiddle
### A metaverse inspired by a generation of Flash games
Built primarily with Node, Phaser, Socket.io, JS & TS

## Running in development mode

First, install node packages:

```bash
npm i -g google-closure-compiler

npm install
```

Then, if you'd like to run the server locally use:

```bash
npm run dev
```

## Running in production mode
Don't forget to install the node packages, next you'd need to build by using:

```bash
npm run build
```

Then you need to compile the public js, ***run the commands in closure-compile.md***

Finally, to start the server use:

```bash
npm start
```

## In both modes, update the .env files ##
src/pre-start/env/production.env

src/pre-start/env/development.env
