# MeTaVeRsE

"We're creating a new phone"

"Cool! What's different?"

"It's revolutionary, we're adding another camera"

## Intro

Hey, welcome to Swiddle's open source code - https://swiddle.io. It feels like everyone in the space is building this, with rather minor differences. I think it would benefit us all if we spent money exploring different ideas instead of funding the same thing. 


Thanks to Philip Lim (Eng), Gamchawizzy (Art), Alex Ronay (Art) and Ipsum (for porting https://richup.io for us).

Shoutout to Club Penguin, the inspiration behind Swiddle, it made so many childhoods memorable and set the stage for a lot of what we see today and will see in the future.

## Features

-> Homes

-> Locations

-> Max user handling (each world instance has a max of X users before a new virtual instance is created. The mechanism is a little more complex.)

-> Multiplayer games (6 custom, 2 imported)

-> Voice and Video when you walk near someone (voice only when outside in the world, voice and video at home)

-> Friends system (with a simple friend reccomendation algo, by mutual friends)

-> Open up your home for an event (with a map to see open events)

-> Decorate your home (with a furniture shop)

-> A currency system (earn coins from games)

## Images

![alt text](https://github.com/ashwwwin/swiddle-source/blob/main/src/public/images/Screen-Shot-2021-11-20-at-16.36.41.png?raw=true)
![alt text](https://github.com/ashwwwin/swiddle-source/blob/main/src/public/images/Screen-Shot-2021-11-20-at-17.27.42.png?raw=true)
![alt text](https://github.com/ashwwwin/swiddle-source/blob/main/src/public/images/Screen-Shot-2021-11-22-at-07.06.06-p-500.png?raw=true)


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
