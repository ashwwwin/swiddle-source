# Swiddle
### A Web3 metaverse inspired by a generation of Flash games
Built primarily with Node, Phaser, Socket.io, JS & TS

## Setting it up


##### Install the dependancies
```bash
npm i -g google-closure-compiler
npm install

npm install --global yarn
yarn install

```
##### Set up the .env files
src/pre-start/env/production.env
src/pre-start/env/development.env


## Running in development mode
```bash
npm run dev
```

## Running in production mode
Build the app by running:

```bash
npm run build
```

Then you need to compile the public js, ***run the commands in closure-compile.md***

Finally, to start the server use:

```bash
npm start
```
