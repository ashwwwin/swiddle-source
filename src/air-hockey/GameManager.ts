import ListenerService from '@/Services/ListenerService'

/* AirHockey
  desc: handles an instance of a game
*/
class AirHockey {
  /* Ctor
    @p1: a reference to player 1's socket
    @p2: a reference to player 2's socket
  */
  gameId: string
  gW: number
  gH: number
  gameActive: Boolean
  puck: { [index: string]: any }
  playerInfo: { [index: string]: any }
  player1: string
  player2: string

  constructor(gameId: string, player1: string, player2: string) {
    this.gameId = gameId

    //== General game variables ==//
    // hard coded game room size variables based on canvas sent to clients
    this.gW = 640	// game width
    this.gH = 400	// game height

    // control varaibles
    this.gameActive = false		// whether or not the game physics are simulated


    //== Game objects ==//
    // create the puck at its default starting values
    this.puck = {
      pos: {
        x: this.gW / 2,
        y: this.gH / 2
      },
      vel: {
        x: 0,
        y: 0
      },
      radius: 25
    }

    this.player1 = player1
    this.player2 = player2

    this.playerInfo = {}
    this.playerInfo[player1] = {
      radius: 50,
      score: 0,
      pos: {
        x: this.gW * 0.75,
        y: this.gH / 2
      },
      side: 0
    }
    this.playerInfo[player2] = {
      radius: 50,
      score: 0,
      pos: {
        x: this.gW * 0.25,
        y: this.gH / 2
      },
      side: 1
    }

    ListenerService.emitRoomEvent(this.gameId, "air-hockey-begin")
    ListenerService.clients.get(this.player2)?.socket.emit("air-hockey-info", { object: "user", side: 1 })

    //== The game starting sequence
    this.notifyUsersMultiple(["First to 7 points wins", "3", "2", "1", "Go!"], 1000)
    this.activateGame(5000)
  }

  // Callback for user update - emitted by each socket each tick, position is sent to other user
  onUpdate(playerId: string, data: any) {
    const player = this.playerInfo[playerId]
    if (player.pos) {
      player.prevPos = player.pos
    } else {
      player.prevPos = data.pos
    }
    player.pos = data.pos

    let opp;
    if (playerId === this.player1) {
      opp = ListenerService.clients.get(this.player2)
    } else {
      opp = ListenerService.clients.get(this.player1)
    }
    opp?.socket.emit("air-hockey-info", { object: "otherUser", pos: data.pos, time: new Date().getTime() })
    
    // socket.on("update", function (data: any) {
    //   if (socket.pos) {
    //     socket.prevPos = socket.pos
    //   }
    //   else {
    //     socket.prevPos = data.pos
    //   }

    //   socket.pos = data.pos
    //   socket.broadcast.to(socket.roomName).emit("air-hockey-info", { object: "otherUser", pos: data.pos, time: new Date().getTime() })
    // })
  }

  /* notifyUsers
    desc: sends a notification to the users, which appears on the game screen
    @msg: the message to display to the users
    @duration: the duration the message should display for
    @delay: allows for a delay before sending the message, for prescheduling messages
  */
  notifyUsers(msg: string, duration: number) {
    ListenerService.emitRoomEvent(this.gameId, "air-hockey-notify", { msg: msg, duration: duration })
  }

  /* notifyUsersMultiple
    desc: sends a series of notifications to the users, which appear on the game screen in sequence
    @msgs: an arry of messages to display to the users
    @duration: the duration each message should display for
  */
  notifyUsersMultiple(msgs: string[], duration: number) {
    for (var i = 0; i < msgs.length; ++i) {
      setTimeout(this.notifyUsers.bind(this), i * duration, msgs[i], duration)
    }
  }

  /* activateGame
    desc: activates the game (enables physics) after an amount of time
    @delay: number of ticks after which to enable
  */
  activateGame(delay: number) {
    const _this = this
    setTimeout(function () {
      setInterval(_this.update.bind(_this), 1000 / 120)
      _this.gameActive = true
    }.bind(this), delay)
  }

  /* deactivateGame
    desc: deactivates the game (disables physics update)
  */
  deactivateGame() {
    this.gameActive = false
  }

  /* distance
    desc: gets the distance between two game objects (of the three, puck and two paddles)
    @obj1: the first object to compare
    @obj2: the second object to compare
  */
  distance(obj1: any, obj2: any) {
    return Math.sqrt(Math.pow(obj2.pos.x - obj1.pos.x, 2) + Math.pow(obj2.pos.y - obj1.pos.y, 2))
  }

  /* pointDistance
    desc: gets the distance between two {x, y} formatted objects
    @obj1: the first object to compare
    @obj2: the second object to compare
  */
  pointDistance(obj1: any, obj2: any) {
    return Math.sqrt(Math.pow(obj2.x - obj1.x, 2) + Math.pow(obj2.y - obj1.y, 2))
  }

  /* vecSubtract
    desc: returns the normalized vector from obj1 to obj2
  */
  vecSubtract(obj1: any, obj2: any) {
    // create the vector between them
    var vec = {
      x: obj2.pos.x - obj1.pos.x,
      y: obj2.pos.y - obj1.pos.y
    }

    // get the distance between these objects
    var dist = this.distance(obj1, obj2)

    // normalize the vector
    vec.x /= dist
    vec.y /= dist

    return vec
  }

  /* update
    desc: updates game physics
  */
  update() {
    if (this.gameActive) {
      // where we'll store the puck's additional velociy, should it need updating
      var newPuckVel = {
        x: 0,
        y: 0
      }

      // the impulse velocity added by each player, if any
      var p1Impulse, p2Impulse
      var spd

      // attempt to add player 1 impulses
      if (this.distance(this.playerInfo[this.player1], this.puck) < this.playerInfo[this.player1].radius + this.puck.radius) {
        // get the player's speed by comparing their position to their previous position
        spd = this.pointDistance(this.playerInfo[this.player1].prevPos, this.playerInfo[this.player1].pos)

        // get the directional vector pointing towards the puck (impulse is in this direction)
        p1Impulse = this.vecSubtract(this.playerInfo[this.player1], this.puck)

        // multiply directional vector by user's speed
        p1Impulse.x *= Math.min(1.75, 1 + Math.pow(spd, 1 / 5))
        p1Impulse.y *= Math.min(1.75, 1 + Math.pow(spd, 1 / 5))

        // add this to the overall new velocity
        newPuckVel.x += p1Impulse.x
        newPuckVel.y += p1Impulse.y
      }

      // attempt to add player 1 impulses
      if (this.distance(this.playerInfo[this.player2], this.puck) < this.playerInfo[this.player2].radius + this.puck.radius) {
        // get the player's speed by comparing their position to their previous position
        spd = this.pointDistance(this.playerInfo[this.player2].prevPos, this.playerInfo[this.player2].pos)

        // get the directional vector pointing towards the puck (impulse is in this direction)
        p2Impulse = this.vecSubtract(this.playerInfo[this.player2], this.puck)

        // multiply directional vector by user's speed
        p2Impulse.x *= Math.min(1.75, 1 + Math.pow(spd, 1 / 5))
        p2Impulse.y *= Math.min(1.75, 1 + Math.pow(spd, 1 / 5))

        // add this to the overall new velocity
        newPuckVel.x += p2Impulse.x
        newPuckVel.y += p2Impulse.y
      }

      // output the puck's new velocity to the clients - only if it updated
      if (p1Impulse || p2Impulse) {
        // add our new velocity to the old
        this.puck.vel.x += newPuckVel.x
        this.puck.vel.y += newPuckVel.y
      }

      // add to the puck's position
      this.puck.pos.x += this.puck.vel.x
      this.puck.pos.y += this.puck.vel.y

      // bouncePuck attempts to bounce the puck off the walls of the game room
      this.bouncePuck()

      // clamp puck within room if it's not entering a goal zone
      if (this.puckInGoalHeight()) {
        this.puck.pos.x = this.clamp(this.puck.pos.x, this.puck.radius, this.gW - this.puck.radius)
      }

      // see if the puck has entered someone's goal
      this.checkForPoint()

      // always clamp vertically
      this.puck.pos.y = this.clamp(this.puck.pos.y, this.puck.radius, this.gH - this.puck.radius)

      // apply friction to the puck
      this.puck.vel.x *= 0.9975
      this.puck.vel.y *= 0.9975

      // clamp velocity to 0 if it's low enough
      if (Math.abs(this.puck.vel.x) < 0.001) {
        this.puck.vel.x = 0
      }
      if (Math.abs(this.puck.vel.y) < 0.001) {
        this.puck.vel.y = 0
      }

      // emit the new puck information to the sockets
      ListenerService.emitRoomEvent(this.gameId, "air-hockey-info", {
        object: "puck",
        pos: this.puck.pos,
        vel: this.puck.vel,
        time: new Date().getTime()
      })
    }
    else {
      // move the puck back to the center with 0 velocity
      this.puck.vel = { x: 0, y: 0 }
      this.puck.pos = { x: this.gW / 2, y: this.gH / 2 }

      // emit the new puck information to the sockets
      ListenerService.emitRoomEvent(this.gameId, "air-hockey-info", {
        object: "puck",
        pos: this.puck.pos,
        vel: this.puck.vel,
        time: new Date().getTime()
      })
    }
  }

  /* checkForPoint
    desc: checks if the puck is within one of the goals, and if so rewards a point
  */
  checkForPoint() {
    // check if the puck is within either of the goals (outside the room)
    var goalScored = ((this.puck.pos.x < 0) || (this.puck.pos.x - this.puck.radius > this.gW))

    // if a goal was scored, determine which side, and emit the score notification
    if (goalScored) {

      // check which side scored based on the puck's x position
      var side

      // puck is on the left, player 1 got the point
      if (this.puck.pos.x < 0) {
        side = 0
        ++this.playerInfo[this.player1].score
      }
      // on the right, player 2 got the point
      else {
        side = 1
        ++this.playerInfo[this.player2].score
      }

      // deactivate physics
      this.deactivateGame()

      // emit the score message containing which side scored
      ListenerService.emitRoomEvent(this.gameId, "air-hockey-score", { side: side })

      // move the puck back to the center with 0 velocity
      this.puck.vel = { x: 0, y: 0 }
      this.puck.pos = { x: this.gW / 2, y: this.gH / 2 }

      // emit the puck's new position to the clients
      ListenerService.emitRoomEvent(this.gameId, "air-hockey-info", {
        object: "puck",
        pos: this.puck.pos,
        vel: this.puck.vel
      })

      // if either player's score is >= 7, they've won
      if (this.playerInfo[this.player1].score >= 7 || this.playerInfo[this.player2].score >= 7) {
        this.notifyUsers("Game Complete", -1)
        const _this = this
        setTimeout(function() {
          ListenerService.endAirHockeyGame(_this.gameId)
        }, 3000)
      }
      // nobody has won, continue
      else {
        // send a resume sequence to the players
        this.notifyUsersMultiple(["3", "2", "1", "Go!"], 500)
        this.activateGame(2000)
      }
    }
  }

  /* bouncePuck
    desc: checks the puck's position and bounces it off the walls
  */
  bouncePuck() {
    // bounce left-right
    if ((this.puck.pos.x - this.puck.radius < 0) || (this.puck.pos.x + this.puck.radius > this.gW)) {
      // only bounce off wall if it's not entering a goal zone
      if (this.puckInGoalHeight()) {
        this.puck.vel.x *= -1
      }
    }

    // bounce up-down
    if ((this.puck.pos.y - this.puck.radius < 0) || (this.puck.pos.y + this.puck.radius > this.gH)) {
      this.puck.vel.y *= -1
    }
  }

  // A helper function used mainly for the puck
  // Returns value clamped within min and max
  clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(val, max))
  }

  // A helper that checks if the puck is within the y range of a goal
  puckInGoalHeight() {
    return (this.puck.pos.y < this.gH * 0.35 || this.puck.pos.y > this.gH * 0.65)
  }

  join(playerId: string) {

  }

  leave(playerId: string) {

  }

  start(playerId: string) {

  }
}

// Export the class as a module
export default AirHockey