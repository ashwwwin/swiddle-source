# MeTaVeRsE

"We're creating a new phone"

"Cool! What's different?"

"It's revolutionary, we're adding another camera"

## Intro

Hey, welcome to Swiddle's open source code - https://swiddle.io. It feels like everyone in the space is building this, with rather minor differences. I think it would benefit us all if we spent money exploring different ideas instead of funding the same thing. 


Thanks to Philip Lim (Eng), Gamchawizzy (Art), Alex Ronay (Art) and Ipsum (for porting https://richup.io for us).

Shoutout to Club Penguin, the inspiration behind Swiddle, it set the stage for a lot of what we see today and will see in the future. It made mine and and countless others childhood's so memorable. 



## Setting it up


##### Install the dependancies
```bash
npm i -g google-closure-compiler
npm install

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
