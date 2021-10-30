import { Socket, Server as SocketServer } from 'socket.io'
const https = require('https')
import { Player, RoomInfo, Client, WhoIsGame, DoodlyGame, LoveHateGame, GuessWhoGame, SeatInfo, CodenameGame, CodenameWord, AirHockeyTable } from '@/Types'
import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import _ from 'underscore'
import UwoGameService from '@uwo/Services/GameService'
import { CardColors, PlayerStatus } from '@uwo/protocols'
import ytsr from 'ytsr'

import winston from 'winston'
import { Loggly } from 'winston-loggly-bulk'

const AccessToken = require('twilio').jwt.AccessToken
const VideoGrant = AccessToken.VideoGrant

const mixpanelToken = process.env.MIXPANEL_TOKEN
const Mixpanel = require('mixpanel')
const mixpanel = Mixpanel.init(mixpanelToken)

const questions = require('@/Models/questions')
const words = require('@/Models/words')
const codenameWords = require('@/Models/codenameWords')
const bannedWords = require('@/Models/bannedWords')
const phraseList = require('@/Models/phraseList')
const furnitureList = require('@/Models/furniture')
const userModel = require('@/Models/user')
const gameRoomModel = require('@/Models/gameRoom')
const doodlyDataModel = require('@/Models/doodlyGameData')
const whoIsDataModel = require('@/Models/whoIsGameData')
const videoModal = require('@/Models/ytvideo')
const friendModal = require('@/Models/friend')
const coinLogModel = require('@/Models/coinLog')
const friendChatModel = require('@/Models/friendChat')
const shopModal = require('@/Models/shop')
const coinGifts = require('@/Models/dailyGifts')
const eventsModel = require('@/Models/events')
const eventInviteResponsesModel = require('@/Models/eventInviteResponses')

const againstHumanity = require('@humanity/game')
import AirHockey from '@/air-hockey/GameManager'

// Connect mongodb
const url = `${process.env.MONGODB_CONNECT_URL}`
mongoose.connect(url, {
  dbName: process.env.DB_NAME,
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  user: process.env.USER_NAME,
  pass: process.env.PASSWORD
})

const db = mongoose.connection
db.once('open', _ => {
  console.log('Database connected:', url)
})
db.on('error', err => {
  console.error('connection error:', err)
})

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({ level: 'debug' }),
    // new winston.transports.File({
    //   filename: `${appRoot}/logs/socket.log`,
    //   tailable: true,
    //   handleExceptions: true,
    // }),
    new Loggly({
      subdomain: process.env.LOGGLY_SUBDOMAIN || '',
      token: process.env.LOGGLY_TOKEN || '',
      json: true,
      tags: ["HTTPS-Request"]
    })
  ]
})

// List of game names that need a custom number of players
const gameMinPlayers: { [index: string]: number } = {
  'codename': 4,
  'who-is': 2,
  'doodly': 2,
  'love-hate': 2,
  'lipoker': 1,
  'humanity': 3,
  'guess-who': 3,
  'uwo': 3,
  'air-hockey': 2,
  'richup': 1
}

//Frequently used as checkPlayers(offeredGame.gameType, playerIds.length)
//It returns true if the minimum number of players have been met and false if not.
function checkPlayers(gameType: string, playerNum: number) {
  //Checks if minimum required players are met
  if (playerNum >= gameMinPlayers[gameType]) {
    //Returns true if met
    return true
  }

  //Returns false if not
  return false
}

//The class which handles events from socket
class ListenerService {
  private io?: SocketServer

  clients: Map<string, Client> = new Map()
  roomList: Map<string, RoomInfo> = new Map()
  playerList: Map<string, Player> = new Map()
  whoIsGameList: Map<string, WhoIsGame> = new Map()
  doodlyGameList: Map<string, DoodlyGame> = new Map()
  loveHateGameList: Map<string, LoveHateGame> = new Map()
  guessWhoGameList: Map<string, GuessWhoGame> = new Map()
  codenameGameList: Map<string, CodenameGame> = new Map()
  airHockeyGameList: Map<string, AirHockey> = new Map()
  playerCntInWorld: { [key: number]: number } = {}
  lastWorldNum = 0

  startPos = {
    home: {
      x: 1575,
      y: 305
    },
    // When go out from home to plaza.
    homeToPlazaPos: {
      x: 2145,
      y: 610
    },
    plazaToShopPos: {
      x: 825,
      y: 250
    },
    shopToPlazaPos: {
      x: 600,
      y: 590
    },
    plazaToPizzaPos: {
      x: 245,
      y: 650,
    },
    pizzaToPlazaPos: {
      x: 1525,
      y: 550,
    },
  }

  seats: { [index: string]: { [index: string]: SeatInfo } } = {
    shop: {
      shop1: {
        seatWidth: 93,
        chairHeight: 70,
        deskHeight: 95,
        count: 5,
        firstPosX: 140,
        firstPosY: 325,
      },
      shop2: {
        seatWidth: 93,
        chairHeight: 70,
        deskHeight: 95,
        count: 5,
        firstPosX: 393,
        firstPosY: 490,
      },
      shop3: {
        seatWidth: 93,
        chairHeight: 70,
        deskHeight: 95,
        count: 7,
        firstPosX: 344,
        firstPosY: 687,
      }
    },
    pizza: {
      pizza1: {
        seatWidth: 98,
        chairHeight: 75,
        deskHeight: 135,
        count: 5,
        firstPosX: 1094,
        firstPosY: 215,
      },
      pizza2: {
        seatWidth: 98,
        chairHeight: 75,
        deskHeight: 135,
        count: 5,
        firstPosX: 1250,
        firstPosY: 442,
      },
      pizza3: {
        seatWidth: 98,
        chairHeight: 75,
        deskHeight: 135,
        count: 5,
        firstPosX: 1384,
        firstPosY: 669,
      }
    },
  }

  constructor() {
    // Update twilio token every 50 minutes
    setInterval(this.updateTwilioToken, 50 * 60 * 1000, this)
  }

  onConnection(socket: Socket) {
    try {
      let client: Client
      let worldNum: number

      socket.on('enter-home', async (data: { playerInfo: Player, password: string }) => {
        try {
          if (this.clients.get(data.playerInfo.id)) {
            this.clients.get(data.playerInfo.id)?.socket.emit('sign-out')
            this.clients.get(data.playerInfo.id)?.socket.disconnect()
            this.clients.delete(data.playerInfo.id)
          }
          const playerInfo = data.playerInfo
          const playerId = playerInfo.id
          client = {
            socket,
            playerId,
            roomId: playerInfo.roomId,
            address: playerInfo.roomId,
            email: ''
          }
          playerInfo.posX = this.startPos.home.x
          playerInfo.posY = this.startPos.home.y

          this.clients.set(playerId, client)

          this.playerList.set(playerId, playerInfo)
          if (!mongoose.Types.ObjectId.isValid(playerId)) {
            return
          }

          const owner = await userModel.findOne({
            _id: playerId
          })
          client.email = owner.email

          let roomInfo = this.roomList.get(playerInfo.roomId)
          if (roomInfo) {
            this.emitHomeEvent(client.address, 'add-player', playerInfo)
            roomInfo.playerInfoList[playerId] = playerInfo
            roomInfo.password = data.password
            roomInfo.furnitureList = owner.furnitureList
            roomInfo.inventories = owner.inventories || {}
            roomInfo.roomName = owner.roomName
            roomInfo.roomDesc = owner.roomDesc
            roomInfo.roomImage = owner.roomImage
            roomInfo.roomVerified = owner.verified
            roomInfo.maxUsers = owner.maxUsers
            roomInfo.lockedRoom = owner.lockedRoom
          } else {
            roomInfo = {
              seatStateList: {},
              playerInfoList: {},
              offeredGames: {},
              requirePassword: false,
              guestCanPlayVideo: false,
              ownerId: playerId,
              password: data.password,
              furnitureList: owner.furnitureList,
              inventories: owner.inventories || {},
              roomName: owner.roomName,
              roomDesc: owner.roomDesc,
              roomImage: owner.roomImage,
              roomVerified: owner.verified,
              maxUsers: owner.maxUsers,
              lockedRoom: owner.lockedRoom
            }
            roomInfo.playerInfoList[playerId] = playerInfo

            this.roomList.set(playerInfo.roomId, roomInfo)
            const copyRoom: any = this.copyRoomInfo(roomInfo)
            copyRoom.ownerId = ''
            this.roomList.set(`${playerInfo.roomId}-design`, copyRoom)
          }

          // Generate twilio token and send it
          const twilioToken = this.generateTwilioToken(playerId)
          client.twilioToken = twilioToken
          socket.emit('twilio-token', twilioToken)

          socket.join(playerInfo.roomId)
          socket.emit('player-list', {
            playerList: roomInfo.playerInfoList,
            guestCanPlayVideo: roomInfo.guestCanPlayVideo,
            playingVideo: roomInfo.playingVideo,
            selectedVideo: roomInfo.selectedVideo,
            inventories: roomInfo.inventories,
            scene: 'home',
            roomId: client.roomId
          })
          client.roomId = playerInfo.roomId

          const friendList = await this.getFriendList(playerId)
          socket.emit('friend-list', friendList)

          this.sendNetworkStatus(playerId)

          const publicRoomList = this.getPublicRoomList()
          socket.emit('public-room-list', publicRoomList)

          const playerCount = Object.keys(roomInfo.playerInfoList).length
          if (playerCount >= (roomInfo.maxUsers || 0)) {
            this.io?.emit('full-room', playerId)
          } else if (!roomInfo.lockedRoom) {
            this.io?.emit('unlocked-room', roomInfo)
          }

          logger.info('enter-home', { playerInfo, roomInfo })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('change-locked', async (locked: boolean) => {
        try {
          const playerId = client.playerId
          const roomId = client.roomId
          if (!playerId || !roomId) {
            return
          }
          const roomInfo = this.roomList.get(roomId)
          if (!roomInfo || roomInfo.ownerId !== playerId) {
            return
          }
          roomInfo.lockedRoom = locked
          userModel.findOneAndUpdate({
            _id: playerId,
          }, {
            lockedRoom: locked
          }, {
            new: true,
            upsert: true
          }).exec()
          socket.emit('change-locked', locked)

          if (locked) {
            this.io?.emit('locked-room', playerId)
          } else {
            this.io?.emit('unlocked-room', roomInfo)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('change-room-settings', async (data: { roomName: string, roomDesc: string, maxUsers: number }) => {
        try {
          const playerId = client.playerId
          const roomId = client.roomId

          if (!playerId || !roomId) {
            return
          }

          const roomInfo = this.roomList.get(roomId)
          if (!roomInfo || roomInfo.ownerId !== playerId) {
            return
          }

          //Limits the numbers of characters
          data.roomName = ((data.roomName).substring(0, 15))
          data.roomDesc = ((data.roomDesc).substring(0, 50))

          roomInfo.roomName = data.roomName
          roomInfo.roomDesc = data.roomDesc
          roomInfo.maxUsers = data.maxUsers
          userModel.findOneAndUpdate({
            _id: playerId,
          }, {
            roomName: data.roomName,
            roomDesc: data.roomDesc,
            maxUsers: data.maxUsers,
          }, {
            new: true,
            upsert: true
          }).exec()

          socket.emit('change-room-settings', data)

          const playerCount = Object.keys(roomInfo.playerInfoList).length
          if (playerCount >= (roomInfo.maxUsers || 0)) {
            this.io?.emit('full-room', playerId)
          } else if (!roomInfo.lockedRoom) {
            this.io?.emit('unlocked-room', roomInfo)
          }
        } catch (err) {
          console.log(err)
        }
      })

      //This updates the room image live
      socket.on('update-room-image', async () => {
        try {
          const playerId = client.playerId
          const roomId = client.roomId

          if (!playerId || !roomId) {
            return
          }

          const roomInfo = this.roomList.get(roomId)
          if (!roomInfo || roomInfo.ownerId !== playerId) {
            return
          }

          var ownUser = await userModel.findOne({
            _id: playerId
          })

          roomInfo.roomImage = ownUser.roomImage

          const playerCount = Object.keys(roomInfo.playerInfoList).length
          if (playerCount >= (roomInfo.maxUsers || 0)) {
            this.io?.emit('full-room', playerId)
          } else if (!roomInfo.lockedRoom) {
            this.io?.emit('unlocked-room', roomInfo)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('visit-home', async (roomId: string) => {
        try {
          client = {
            socket,
            address: '',
          }
          const owner = await userModel.findOne({
            address: roomId.toLowerCase()
          })
          if (!owner) {
            socket.emit('wrong-address')
            logger.debug('wrong-address', { roomId })
            return
          }

          const roomInfo = this.roomList.get(roomId)
          if (!roomInfo || !this.clients.get(roomInfo.ownerId)) {
            socket.emit('empty-home')

            logger.debug('empty-home', { roomId, owner: this.clients.get(roomInfo?.ownerId || '') })
          } else {
            if (roomInfo.requirePassword) {
              socket.emit('enter-password')
            }
            client.roomId = roomId
            socket.join(roomId)

            logger.info('visit-home', { roomInfo })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('knock-on', (playerInfo: Player) => {
        try {
          if (playerInfo.guest) {
            playerInfo.id = uuidv4()
            socket.emit('set-playerId', playerInfo.id)
          }
          client = {
            socket,
            playerId: playerInfo.id,
            roomId: playerInfo.roomId,
            address: playerInfo.roomId,
          }
          playerInfo.posX = this.startPos.home.x
          playerInfo.posY = this.startPos.home.y
          if (this.clients.get(playerInfo.id)) {
            this.clients.get(playerInfo.id)?.socket.emit('sign-out')
            this.clients.get(playerInfo.id)?.socket.disconnect()
            this.clients.delete(playerInfo.id)
          }
          this.clients.set(playerInfo.id, client)
          this.playerList.set(playerInfo.id, playerInfo)
          const roomInfo = this.roomList.get(client.roomId || '')
          if (!roomInfo || !this.clients.get(roomInfo.ownerId)) {
            socket.emit('empty-home')
            socket.leave(client.roomId || '')
            client.roomId = ''

            logger.debug('empty-home', { roomId: client.roomId, owner: this.clients.get(roomInfo?.ownerId || '') })
          } else {
            this.clients.get(roomInfo.ownerId)?.socket.emit('knock-on', playerInfo)

            logger.info('knock-on', { playerInfo, roomInfo })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('enter-password', (password: string) => {
        try {
          if (this.roomList.get(client.roomId || '')?.password === password) {
            socket.emit('correct-password')

            logger.info('enter-password', { password, result: 'correct' })
          } else {
            socket.emit('wrong-password')

            logger.info('enter-password', { password, result: 'wrong' })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('ignore-knock', (playerId: string) => {
        try {
          const playerClient = this.clients.get(playerId)
          if (playerClient) {
            playerClient.socket.emit('ignore-knock')
            playerClient.socket.leave(client.address)
            playerClient.roomId = ''
          }

          logger.info('ignore-knock', { playerInfo: this.playerList.get(playerId) })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('accept-knock', async (playerId: string) => {
        try {
          const playerInfo = this.playerList.get(playerId)
          const roomInfo = this.roomList.get(client.address)
          const playerClient = this.clients.get(playerId)
          if (roomInfo && playerInfo && playerClient) {
            this.emitHomeEvent(client.address, 'add-player', playerInfo)
            roomInfo.playerInfoList[playerId] = playerInfo
            playerClient.roomId = client.address

            // Generate twilio token and send it
            const twilioToken = this.generateTwilioToken(playerId)
            playerClient.twilioToken = twilioToken
            playerClient.socket.emit('twilio-token', twilioToken)

            playerClient.socket.emit('player-list', {
              playerList: roomInfo.playerInfoList,
              guestCanPlayVideo: roomInfo.guestCanPlayVideo,
              playingVideo: roomInfo.playingVideo,
              selectedVideo: roomInfo.selectedVideo,
              scene: 'home',
              force: true,
              inventories: roomInfo.inventories,
              roomId: playerClient.roomId
            })
            playerClient.socket.join(client.address)

            const playerCount = Object.keys(roomInfo.playerInfoList).length
            if (playerCount >= (roomInfo.maxUsers || 0)) {
              this.io?.emit('full-room', playerId)
            } else if (!roomInfo.lockedRoom) {
              this.io?.emit('unlocked-room', roomInfo)
            }

            if (!playerInfo.guest) {
              const friendList = await this.getFriendList(playerId)
              playerClient.socket.emit('friend-list', friendList)

              this.sendNetworkStatus(playerId)
            }

            logger.info('accept-knock', { playerInfo, roomInfo })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('eject-player', (playerId: string) => {
        try {
          const playerClient = this.clients.get(playerId)
          const roomInfo = this.roomList.get(client.address)
          // TODO: Check if the player is home owner
          if (roomInfo && playerClient && playerClient.roomId === client.address) {
            const playerInfoList = roomInfo.playerInfoList
            const seatStateList = roomInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            this.emitHomeEvent(client.address, 'remove-player', playerId)
            playerClient.socket.emit('eject-player')
            playerClient.socket.leave(client.address)
            playerClient.roomId = ''
            playerClient.socket.disconnect()

            logger.info('eject-player', { playerInfo: this.playerList.get((playerId)), roomInfo })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('plaza-to-home', async () => {
        try {
          if (client.roomId !== `${worldNum}-plaza`) {
            logger.debug('plaza-to-home', { playerInfo: this.playerList.get(client.playerId || ''), roomId: client.roomId })
            return
          }
          const playerId = client.playerId || ''
          const playerInfo = this.playerList.get(playerId)
          const roomInfo = this.roomList.get(client.address)
          const plazaInfo = this.roomList.get(`${worldNum}-plaza`)

          logger.info('plaza-to-home', { playerInfo, plazaInfo, roomInfo })

          if (playerId && playerInfo && plazaInfo) {
            // Leave plaza
            const playerInfoList = plazaInfo.playerInfoList
            const seatStateList = plazaInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            socket.leave(`${worldNum}-plaza`)
            this.emitHomeEvent(`${worldNum}-plaza`, 'remove-player', playerId)
            this.playerCntInWorld[worldNum]--

            if (client.address && roomInfo) {
              // Join room
              playerInfo.posX = this.startPos.home.x
              playerInfo.posY = this.startPos.home.y
              this.emitHomeEvent(client.address, 'add-player', playerInfo)
              roomInfo.playerInfoList[playerId] = playerInfo
              client.roomId = client.address

              socket.emit('player-list', {
                playerList: roomInfo.playerInfoList,
                scene: 'home',
                inventories: roomInfo.inventories,
                roomId: client.roomId
              })
              socket.join(client.address)

              const playerCount = Object.keys(roomInfo.playerInfoList).length
              if (playerCount >= (roomInfo.maxUsers || 0)) {
                this.io?.emit('full-room', playerId)
              } else if (!roomInfo.lockedRoom) {
                this.io?.emit('unlocked-room', roomInfo)
              }
            } else {
              client.roomId = ''
              socket.emit('empty-home')

              logger.debug('empty-home', { roomId: client.roomId, owner: this.clients.get(roomInfo?.ownerId || '') })
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('home-to-plaza', () => {
        try {
          const playerId = client.playerId || ''
          const playerInfo = this.playerList.get(playerId)
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)
          worldNum = this.getWorldNum()
          const plazaInfo = this.roomList.get(`${worldNum}-plaza`)

          if (playerId && playerInfo && roomId && roomInfo && plazaInfo) {
            // Leave room
            const playerInfoList = roomInfo.playerInfoList
            const seatStateList = roomInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            socket.leave(roomId)
            this.emitHomeEvent(roomId, 'remove-player', playerId)

            // Join plaza
            playerInfo.posX = this.startPos.homeToPlazaPos.x
            playerInfo.posY = this.startPos.homeToPlazaPos.y
            this.emitHomeEvent(`${worldNum}-plaza`, 'add-player', playerInfo)
            plazaInfo.playerInfoList[playerId] = playerInfo
            client.roomId = `${worldNum}-plaza`
            socket.emit('player-list', {
              playerList: plazaInfo.playerInfoList,
              scene: 'plaza',
              roomId: client.roomId
            })
            socket.join(`${worldNum}-plaza`)
            this.playerCntInWorld[worldNum]++

            logger.info('home-to-plaza', { playerInfo, roomInfo: this.copyRoomInfo(roomInfo), plazaInfo })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('plaza-to-shop', () => {
        try {
          if (client.roomId !== `${worldNum}-plaza`) {
            logger.debug('plaza-to-shop', { playerInfo: this.playerList.get(client.playerId || ''), roomId: client.roomId })
            return
          }
          const playerId = client.playerId || ''
          const playerInfo = this.playerList.get(playerId)
          const plazaInfo = this.roomList.get(`${worldNum}-plaza`)
          const shopInfo = this.roomList.get(`${worldNum}-shop`)

          logger.info('plaza-to-shop', { playerInfo, plazaInfo, shopInfo })

          if (playerId && playerInfo && plazaInfo && shopInfo) {
            // Leave plaza
            const playerInfoList = plazaInfo.playerInfoList
            const seatStateList = plazaInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            socket.leave(`${worldNum}-plaza`)
            this.emitHomeEvent(`${worldNum}-plaza`, 'remove-player', playerId)

            // Join coffee shop
            playerInfo.posX = this.startPos.plazaToShopPos.x
            playerInfo.posY = this.startPos.plazaToShopPos.y
            this.emitHomeEvent(`${worldNum}-shop`, 'add-player', playerInfo)
            shopInfo.playerInfoList[playerId] = playerInfo
            client.roomId = `${worldNum}-shop`
            socket.emit('player-list', {
              playerList: shopInfo.playerInfoList,
              seats: this.seats.shop,
              scene: 'shop',
              roomId: client.roomId
            })
            socket.join(`${worldNum}-shop`)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('shop-to-plaza', () => {
        try {
          if (client.roomId !== `${worldNum}-shop`) {
            logger.debug('shop-to-plaza', { playerInfo: this.playerList.get(client.playerId || ''), roomId: client.roomId })
            return
          }
          const playerId = client.playerId || ''
          const playerInfo = this.playerList.get(playerId)
          const plazaInfo = this.roomList.get(`${worldNum}-plaza`)
          const shopInfo = this.roomList.get(`${worldNum}-shop`)

          logger.info('shop-to-plaza', { playerInfo, shopInfo, plazaInfo })

          if (playerId && playerInfo && plazaInfo && shopInfo) {
            // Leave plaza
            const playerInfoList = shopInfo.playerInfoList
            const seatStateList = shopInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            socket.leave(`${worldNum}-shop`)
            this.emitHomeEvent(`${worldNum}-shop`, 'remove-player', playerId)

            // Join coffee shop
            playerInfo.posX = this.startPos.shopToPlazaPos.x
            playerInfo.posY = this.startPos.shopToPlazaPos.y
            this.emitHomeEvent(`${worldNum}-plaza`, 'add-player', playerInfo)
            plazaInfo.playerInfoList[playerId] = playerInfo
            client.roomId = `${worldNum}-plaza`
            socket.emit('player-list', {
              playerList: plazaInfo.playerInfoList,
              scene: 'plaza',
              roomId: client.roomId
            })
            socket.join(`${worldNum}-plaza`)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('plaza-to-pizza', () => {
        try {
          if (client.roomId !== `${worldNum}-plaza`) {
            logger.debug('plaza-to-pizza', { playerInfo: this.playerList.get(client.playerId || ''), roomId: client.roomId })
            return
          }
          const playerId = client.playerId || ''
          const playerInfo = this.playerList.get(playerId)
          const pizzaInfo = this.roomList.get(`${worldNum}-pizza`)
          const plazaInfo = this.roomList.get(`${worldNum}-plaza`)

          logger.info('plaza-to-pizza', { playerInfo, plazaInfo, pizzaInfo })

          if (playerId && playerInfo && pizzaInfo && plazaInfo) {
            // Leave pizza
            const playerInfoList = plazaInfo.playerInfoList
            const seatStateList = plazaInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            socket.leave(`${worldNum}-plaza`)
            this.emitHomeEvent(`${worldNum}-plaza`, 'remove-player', playerId)

            // Join coffee plaza
            playerInfo.posX = this.startPos.plazaToPizzaPos.x
            playerInfo.posY = this.startPos.plazaToPizzaPos.y
            this.emitHomeEvent(`${worldNum}-pizza`, 'add-player', playerInfo)
            pizzaInfo.playerInfoList[playerId] = playerInfo
            client.roomId = `${worldNum}-pizza`
            socket.emit('player-list', {
              playerList: pizzaInfo.playerInfoList,
              seats: this.seats.pizza,
              scene: 'pizza',
              roomId: client.roomId
            })
            socket.join(`${worldNum}-pizza`)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('pizza-to-plaza', () => {
        try {
          if (client.roomId !== `${worldNum}-pizza`) {
            logger.debug('pizza-to-plaza', { playerInfo: this.playerList.get(client.playerId || ''), roomId: client.roomId })
            return
          }
          const playerId = client.playerId || ''
          const playerInfo = this.playerList.get(playerId)
          const pizzaInfo = this.roomList.get(`${worldNum}-pizza`)
          const plazaInfo = this.roomList.get(`${worldNum}-plaza`)

          logger.info('pizza-to-plaza', { playerInfo, plazaInfo, pizzaInfo })

          if (playerId && playerInfo && pizzaInfo && plazaInfo) {
            // Leave pizza
            const playerInfoList = pizzaInfo.playerInfoList
            const seatStateList = pizzaInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            socket.leave(`${worldNum}-pizza`)
            this.emitHomeEvent(`${worldNum}-pizza`, 'remove-player', playerId)

            // Join coffee plaza
            playerInfo.posX = this.startPos.pizzaToPlazaPos.x
            playerInfo.posY = this.startPos.pizzaToPlazaPos.y
            this.emitHomeEvent(`${worldNum}-plaza`, 'add-player', playerInfo)
            plazaInfo.playerInfoList[playerId] = playerInfo
            client.roomId = `${worldNum}-plaza`
            socket.emit('player-list', {
              playerList: plazaInfo.playerInfoList,
              scene: 'plaza',
              roomId: client.roomId
            })
            socket.join(`${worldNum}-plaza`)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('change-password', (password: string) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          if (roomInfo) {
            roomInfo.password = password
            socket.emit('change-password', password)

            logger.info('change-password', { roomInfo: this.copyRoomInfo(roomInfo), password })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('require-password', (flag: boolean) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          if (roomInfo) {
            roomInfo.requirePassword = flag
            socket.emit('require-password', flag)

            logger.info('require-password', { roomInfo: this.copyRoomInfo(roomInfo), flag })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('update-message', (msg: string) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          if (roomInfo) {
            if (client.roomId !== client.address) {
              const newMessage = msg.toLocaleLowerCase()
              for (const bannedWord of bannedWords) {
                if (newMessage.includes(bannedWord)) {
                  this.emitHomeEvent(client.roomId || '', 'banned-message', {
                    id: client.playerId || '',
                  })
                  // socket.emit('warning-message', `You can't say "${bannedWord}" to maintain a respectful environment.`)

                  logger.debug('banned-message', { playerInfo: this.playerList.get(client.playerId || ''), msg })
                  return
                }
              }
            }

            // roomInfo.playerInfoList[client.playerId || ''].lastMsg = ''
            this.emitHomeEvent(client.roomId || '', 'update-message', {
              id: client.playerId || '',
              msg,
            })

            logger.info('update-message', { playerInfo: this.playerList.get(client.playerId || ''), msg })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('game-msg', (msg: string) => {
        try {
          const gameRoomId = client?.gameRoomId || ''
          if (client.roomId !== client.address) {
            const newMessage = msg.toLocaleLowerCase()
            for (const bannedWord of bannedWords) {
              if (newMessage.includes(bannedWord)) {
                this.emitRoomEvent(gameRoomId, 'banned-game-msg', {
                  id: client.playerId || '',
                })

                logger.debug('banned-game-msg', { playerInfo: this.playerList.get(client.playerId || ''), msg })
                return
              }
            }
          }

          this.emitRoomEvent(gameRoomId, 'game-msg', {
            id: client.playerId || '',
            msg,
          })

          logger.info('game-msg', { gameRoomId, gameType: client.gameType, msg })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('update-position', (data: { posX: number, posY: number }) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          const playerId = client.playerId || ''
          if (playerId && roomInfo) {
            if (roomInfo.playerInfoList[playerId]) {
              // roomInfo.playerInfoList[playerId].posX = data.posX
              // roomInfo.playerInfoList[playerId].posY = data.posY
              const playerSeatTableId = roomInfo.playerInfoList[playerId]?.seatTableId
              const playerSeatPos = roomInfo.playerInfoList[playerId].seatPos
              if (playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
                delete roomInfo.seatStateList[playerSeatTableId][playerSeatPos]
                roomInfo.playerInfoList[playerId].seatTableId = undefined
                roomInfo.playerInfoList[playerId].seatPos = undefined

                if (client.gameRoomId) {
                  this.leaveGameRoom(client.roomId || '', client.gameRoomId, playerId)
                }
              }
              this.emitHomeEvent(client.roomId || '', 'update-position', {
                ...data,
                id: playerId,
              })
            } else {
              socket.emit('update-position', {
                ...data,
                id: playerId,
              })
            }

            logger.info('update-position', { roomInfo: this.copyRoomInfo(roomInfo), playerInfo: roomInfo?.playerInfoList[playerId] })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('updated-position', (data: { posX: number, posY: number }) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          if (roomInfo) {
            if (roomInfo.playerInfoList[client.playerId || '']) {
              roomInfo.playerInfoList[client.playerId || ''].posX = data.posX
              roomInfo.playerInfoList[client.playerId || ''].posY = data.posY
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('sit-down', (data: { tableId: string, pos: number }) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          const seatStateList = roomInfo?.seatStateList
          const playerId = client.playerId || ''
          if (roomInfo && seatStateList && playerId && roomInfo.playerInfoList[playerId]) {
            if (!seatStateList[data.tableId]) {
              seatStateList[data.tableId] = {}
            }
            const playerSeatTableId = roomInfo.playerInfoList[playerId]?.seatTableId
            const playerSeatPos = roomInfo.playerInfoList[playerId].seatPos
            if (playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null && seatStateList[playerSeatTableId]) {
              if (playerSeatTableId !== data.tableId && client.gameRoomId) {
                this.leaveGameRoom(client.roomId || '', client.gameRoomId, playerId)
              }
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            seatStateList[data.tableId][data.pos] = playerId
            roomInfo.playerInfoList[playerId].seatTableId = data.tableId
            roomInfo.playerInfoList[playerId].seatPos = data.pos
            this.emitHomeEvent(client.roomId || '', 'sit-down', {
              id: playerId,
              pos: data.pos,
              tableId: data.tableId
            })

            if (!playerSeatPos && !client.gameRoomId) {
              for (const gameRoomId in roomInfo.offeredGames) {
                if (roomInfo.offeredGames[gameRoomId].tableId === data.tableId) {
                  this.joinGameRoom(client.roomId || '', gameRoomId, playerId)
                  break
                }
              }
            }

            logger.info('sit-down', { roomInfo: this.copyRoomInfo(roomInfo), seatStateList, playerInfo: roomInfo.playerInfoList[playerId] })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('choose-game', (tableId) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          if (!roomInfo) {
            return
          }

          // let gameRoomCnt = 0
          // let chooseGameRoomId
          for (const gameRoomId in roomInfo.offeredGames) {
            // chooseGameRoomId = gameRoomId
            // gameRoomCnt++
            if (roomInfo.offeredGames[gameRoomId].tableId === tableId) {
              this.joinGameRoom(client.roomId || '', gameRoomId, client.playerId || '')
              return
            }
          }

          // if (gameRoomCnt === 1 && chooseGameRoomId) {
          //   const rs = this.joinGamePlayer(client.roomId || '', chooseGameRoomId, client.playerId || '')
          //   if (rs) {
          //     return
          //   }
          // }
          socket.emit('choose-game')

          logger.info('choose-game', { roomInfo: this.copyRoomInfo(roomInfo), playerInfo: this.playerList.get(client.playerId || '') })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('offer-game', (data: { tableId: string, gameType: string }) => {
        try {
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(client.roomId || '')
          const playerId = client.playerId || ''
          if (!roomId || !roomInfo || !playerId) {
            return
          }

          let gameRoomId = client?.gameRoomId || ''
          if (gameRoomId && roomInfo.offeredGames[gameRoomId]) {
            socket.emit('exist-playing-game')
            return
          }

          const listOfGames = roomInfo.offeredGames,
            playerInfoList = roomInfo.playerInfoList,
            seatStateList = roomInfo.seatStateList

          for (const gameRoomId in listOfGames) {
            if (listOfGames[gameRoomId].tableId === data.tableId) {
              this.joinGameRoom(roomId, gameRoomId, playerId)
              return
            }
          }

          gameRoomId = uuidv4()
          roomInfo.offeredGames[gameRoomId] = {
            tableId: data.tableId,
            gameType: data.gameType,
            gameRoomId,
            gameState: 'waiting',
            playerIds: [playerId],
            countDown: 15,
          }

          for (const seatPos in seatStateList[data.tableId]) {
            const pId = seatStateList[data.tableId][seatPos]
            if (pId !== playerId) {
              this.clients.get(pId)?.socket.emit('offer-game', {
                tableId: data.tableId,
                gameType: data.gameType,
                gameRoomId,
                creatorId: playerId
              })
            }
          }

          playerInfoList[playerId].gameState = 'accept'
          client.gameRoomId = gameRoomId
          client.gameType = data.gameType
          socket.join(gameRoomId)

          // If gameType is lipoker, player can start the game
          if (data.gameType === 'lipoker') {
            this.startGame(roomId, gameRoomId)
          } else {
            socket.emit('waiting-players', gameRoomId)
          }

          logger.info('offer-game', { roomInfo: this.copyRoomInfo(roomInfo), playerInfo: playerInfoList[playerId], gameType: data.gameType, gameRoomId })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('cancel-game', (gameRoomId) => {
        try {
          if (client.gameRoomId !== gameRoomId) {
            return
          }

          this.leaveGameRoom(client.roomId || '', gameRoomId, client.playerId || '')
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('accept-play-game', (gameRoomId: string) => {
        try {
          this.joinGameRoom(client.roomId || '', gameRoomId, client.playerId || '')
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('reject-play-game', (gameRoomId: string) => {
        try {
          const roomInfo = this.roomList.get(client.roomId || '')
          const playerInfoList = roomInfo?.playerInfoList
          if (roomInfo && playerInfoList) {
            playerInfoList[client.playerId || ''].gameState = ''
            client.gameRoomId = undefined
            client.gameType = undefined
            socket.leave(gameRoomId)

            logger.info('reject-play-game', { roomInfo: this.copyRoomInfo(roomInfo), playerInfo: playerInfoList[client.playerId || ''], gameRoomId })
          }
        } catch (err) {
          console.log(err)
        }
      })

      // Sockets for invitation
      socket.on('invite-player', async (playerId: string) => {
        try {
          const roomInfo = this.roomList.get(client.address)

          if (!roomInfo || roomInfo.ownerId !== client.playerId) {
            return
          }

          logger.info('invite-player', { roomInfo: this.copyRoomInfo(roomInfo), playerInfo: this.playerList.get(playerId) })

          const playerClient = this.clients.get(playerId)
          playerClient?.socket.emit('invite-player', {
            playerId: client.playerId,
            address: client.address,
          })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('ignore-invitation', (data: { playerId: string, friend?: boolean }) => {
        try {
          const playerClient = this.clients.get(data.playerId)
          if (playerClient) {
            playerClient.socket.emit('ignore-invitation', this.playerList.get(client.playerId || '')?.name)
          }

          logger.info('ignore-invitation', { from: client.playerId, ...data })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('accept-invitation', async (data: { playerId: string, address: string, friend?: boolean }) => {
        try {
          const homeOwner = this.clients.get(data.playerId)
          const playerId = client.playerId || ''
          const roomId = client.roomId || ''
          const playerInfo = this.playerList.get(playerId)
          const roomInfo = this.roomList.get(data.address)
          const outsideInfo = this.roomList.get(roomId)
          if (homeOwner && playerId && playerInfo && roomInfo && outsideInfo) {
            homeOwner.socket.emit('accept-invitation', playerInfo.name)

            // Leave plaza or coffeeShop
            const playerInfoList = outsideInfo.playerInfoList
            const seatStateList = outsideInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            socket.leave(roomId)
            this.emitHomeEvent(roomId, 'remove-player', playerId)
            this.playerCntInWorld[worldNum]--

            // Join room
            playerInfo.posX = this.startPos.home.x
            playerInfo.posY = this.startPos.home.y
            this.emitHomeEvent(data.address, 'add-player', playerInfo)
            roomInfo.playerInfoList[playerId] = playerInfo
            client.roomId = data.address

            socket.emit('player-list', {
              playerList: roomInfo.playerInfoList,
              scene: 'home',
              force: true,
              inventories: roomInfo.inventories,
              roomId: client.roomId
            })
            socket.join(data.address)

            const playerCount = Object.keys(roomInfo.playerInfoList).length
            if (playerCount >= (roomInfo.maxUsers || 0)) {
              this.io?.emit('full-room', playerId)
            } else if (!roomInfo.lockedRoom) {
              this.io?.emit('unlocked-room', roomInfo)
            }

            logger.info('accept-invitation', { roomInfo: this.copyRoomInfo(roomInfo), playerInfo, homeOwner: this.playerList.get(data.playerId), firend: data.friend })
          }
        } catch (err) {
          console.log(err)
        }
      })

      // Sockets for friend system
      socket.on('add-friend', async (playerId: string) => {
        try {
          if (!client.playerId || !mongoose.Types.ObjectId.isValid(client.playerId) || !mongoose.Types.ObjectId.isValid(playerId)) {
            return
          }
          const exist = await friendModal.findOne({
            $or: [{
              sender: client.playerId,
              receiver: playerId
            }, {
              sender: playerId,
              receiver: client.playerId
            }]
          })
          if (exist) {
            socket.emit('exist-friend')
            return
          }
          const friend = new friendModal({
            sender: client.playerId,
            receiver: playerId,
            send_date: new Date()
          })
          await friend.save()
          socket.emit('success-add-friend')
          const playerClient = this.clients.get(playerId)
          if (playerClient) {
            playerClient.socket.emit('add-friend', this.playerList.get(client.playerId || ''))
          }

          // mixpanel.track('Send Friend Request By Button', {
          //   'email': client.email,
          //   'friend': playerId
          // })

          logger.info('add-friend', { sender: this.playerList.get(client.playerId || ''), receiver: this.playerList.get(playerId) })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('add-friend-by-address', async (address: string) => {
        try {
          if (!client.playerId || !mongoose.Types.ObjectId.isValid(client.playerId)) {
            return
          }
          const player = await userModel.findOne({
            address: new RegExp(`^${address}$`, 'i'),
          })
          if (!player) {
            socket.emit('wrong-friend-name')
            return
          }
          const playerId = player.id
          const exist = await friendModal.findOne({
            $or: [{
              sender: client.playerId,
              receiver: playerId
            }, {
              sender: playerId,
              receiver: client.playerId
            }]
          })
          if (exist) {
            socket.emit('exist-friend', address)
            return
          } if (playerId == client.playerId) {
            //Can't add themselves as a friend
            socket.emit('exist-friend', address)
            return
          }
          const friend = new friendModal({
            sender: client.playerId,
            receiver: playerId,
            send_date: new Date()
          })
          await friend.save()
          socket.emit('success-add-friend', address)
          const playerClient = this.clients.get(playerId)
          if (playerClient) {
            playerClient.socket.emit('add-friend', this.playerList.get(client.playerId || ''))
          }

          // mixpanel.track('Send Friend Request By Address', {
          //   'email': client.email,
          //   'friend': playerId,
          //   'address': address
          // })

          logger.info('add-friend-by-address', { sender: this.playerList.get(client.playerId || ''), receiver: this.playerList.get(playerId) })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('accept-friend', async (playerId: string) => {
        try {
          const friend = await friendModal.findOneAndUpdate({
            sender: playerId,
            receiver: client.playerId
          }, {
            receive_date: new Date()
          }).populate('sender', ['name', 'avatar'])
            .populate('receiver', ['name', 'avatar'])
            .exec()
          const playerClient = this.clients.get(playerId)
          if (playerClient) {
            playerClient.socket.emit('accept-friend', friend.receiver)
          }
          socket.emit('added-friend', {
            friend: friend.sender,
            status: playerClient != undefined
          })

          // mixpanel.track('Successful Friend Request', {
          //   'email': client.email,
          //   'friendId': friend.sender
          // })

          logger.info('accept-friend', { sender: this.playerList.get(playerId), receiver: this.playerList.get(client.playerId || '') })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('ignore-friend', async (playerId: string) => {
        try {
          await friendModal.deleteOne({
            sender: playerId,
            receiver: client.playerId
          })
          const playerClient = this.clients.get(playerId)
          if (playerClient) {
            playerClient.socket.emit('ignore-friend', {
              playerId: client.playerId,
              name: this.playerList.get(client.playerId || '')?.name
            })
          }

          logger.info('ignore-friend', { sender: this.playerList.get(playerId), receiver: this.playerList.get(client.playerId || '') })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('remove-friend', async (playerId: string) => {
        try {
          await friendModal.deleteOne({
            $or: [{
              sender: client.playerId,
              receiver: playerId
            }, {
              sender: playerId,
              receiver: client.playerId
            }]
          })
          const playerClient = this.clients.get(playerId)
          if (playerClient) {
            playerClient.socket.emit('remove-friend', client.playerId)
          }

          logger.info('remove-friend', { sender: this.playerList.get(client.playerId || ''), receiver: this.playerList.get(playerId) })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('ring-friend', async (playerId: string) => {
        try {
          const ownId = client.playerId
          const ownerClient = this.clients.get(playerId)
          const roomId = ownerClient?.address || ''
          const newRoomInfo = this.roomList.get(roomId) || ''

          if (!ownerClient || ownerClient.address === client.roomId || !newRoomInfo) {
            return
          }

          //Getting the current time & time plus 1 hour
          const timeNow = new Date()
          var timeNowMinusHour = new Date()
          timeNowMinusHour.setTime(timeNowMinusHour.getTime() - 3600000)

          //Looking for all the events happening at this time that are relevant to the user
          var validInvite = false
          var playerEvent = await eventsModel.find({
            eventCreator: mongoose.Types.ObjectId(playerId),
            invites: ownId,
            canceled: false,
            eventTime: {
              $lt: timeNow,
              $gt: timeNowMinusHour
            }
          })

          if (playerEvent.length >= 1) {
            validInvite = true
            // mixpanel.track('Join Event', {
            //   'email': client.email,
            //   'friend': playerId
            // })
          }

          if (newRoomInfo.lockedRoom && validInvite == false) {
            //If the room is locked and the user has no valid invite
            const playerInfo = this.playerList.get(client.playerId || '')
            if (playerInfo) {
              ownerClient.socket.emit('ring-friend', playerInfo)
            }

            logger.info('ring-friend', { sender: this.playerList.get(client.playerId || ''), receiver: this.playerList.get(playerId) })
          } else {
            const myPlayerId = client.playerId
            const playerInfo = this.playerList.get(myPlayerId || '')
            const roomInfo = this.roomList.get(client.roomId || '')

            if (client.roomId && myPlayerId && playerInfo && roomInfo && newRoomInfo) {
              // Leave room
              const playerInfoList = roomInfo.playerInfoList
              const seatStateList = roomInfo.seatStateList
              const playerSeatTableId = playerInfoList[myPlayerId]?.seatTableId
              const playerSeatPos = playerInfoList[myPlayerId].seatPos
              if (playerInfoList[myPlayerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
                delete seatStateList[playerSeatTableId][playerSeatPos]
                playerInfo.seatTableId = undefined
                playerInfo.seatPos = undefined
              }
              delete playerInfoList[myPlayerId]
              socket.leave(client.roomId)
              this.emitHomeEvent(client.roomId, 'remove-player', myPlayerId)

              playerInfo.posX = this.startPos.home.x
              playerInfo.posY = this.startPos.home.y

              this.emitHomeEvent(ownerClient.address, 'add-player', playerInfo)
              newRoomInfo.playerInfoList[myPlayerId] = playerInfo
              client.roomId = ownerClient.address

              client.socket.emit('player-list', {
                playerList: newRoomInfo.playerInfoList,
                guestCanPlayVideo: newRoomInfo.guestCanPlayVideo,
                playingVideo: newRoomInfo.playingVideo,
                selectedVideo: newRoomInfo.selectedVideo,
                scene: 'home',
                force: true,
                inventories: newRoomInfo.inventories,
                roomId: ownerClient.address
              })

              let playerCount = Object.keys(roomInfo.playerInfoList).length

              if (playerCount >= (roomInfo.maxUsers || 0) || validInvite == true) {
                //Checks if the user has a valid invite from the event
                if (validInvite == true) {
                  this.io?.emit('unlocked-room', roomInfo)
                } else {
                  this.io?.emit('full-room', playerId)
                }
              } else if (!roomInfo.lockedRoom) {
                this.io?.emit('unlocked-room', roomInfo)
              }

              playerCount = Object.keys(newRoomInfo.playerInfoList).length
              if (playerCount >= (newRoomInfo.maxUsers || 0) || validInvite == true) {
                if (validInvite == true) {
                  this.io?.emit('unlocked-room', newRoomInfo)
                } else {
                  this.io?.emit('full-room', playerId)
                }
              } else if (!newRoomInfo.lockedRoom) {
                // mixpanel.track('Join Explore Room', {
                //   'email': client.email,
                //   'friend': playerId
                // })
                this.io?.emit('unlocked-room', newRoomInfo)
              }
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('accept-ring-friend', async (playerId: string) => {
        try {
          const playerInfo = this.playerList.get(playerId)
          const newRoomInfo = this.roomList.get(client.address)
          const playerClient = this.clients.get(playerId)
          const roomId = playerClient?.roomId || ''
          const roomInfo = this.roomList.get(roomId)

          if (roomInfo && playerInfo && playerClient && newRoomInfo) {
            // Leave room
            const playerInfoList = roomInfo.playerInfoList
            const seatStateList = roomInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
              playerInfo.seatTableId = undefined
              playerInfo.seatPos = undefined
            }
            delete playerInfoList[playerId]
            socket.leave(roomId)
            this.emitHomeEvent(roomId, 'remove-player', playerId)

            playerInfo.posX = this.startPos.home.x
            playerInfo.posY = this.startPos.home.y

            this.emitHomeEvent(client.address, 'add-player', playerInfo)
            newRoomInfo.playerInfoList[playerId] = playerInfo
            playerClient.roomId = client.address

            playerClient.socket.emit('player-list', {
              playerList: newRoomInfo.playerInfoList,
              guestCanPlayVideo: newRoomInfo.guestCanPlayVideo,
              playingVideo: newRoomInfo.playingVideo,
              selectedVideo: newRoomInfo.selectedVideo,
              scene: 'home',
              force: true,
              inventories: newRoomInfo.inventories,
              roomId: playerClient.roomId
            })

            let playerCount = Object.keys(roomInfo.playerInfoList).length
            if (playerCount >= (roomInfo.maxUsers || 0)) {
              this.io?.emit('full-room', playerId)
            } else if (!roomInfo.lockedRoom) {
              this.io?.emit('unlocked-room', roomInfo)
            }

            playerCount = Object.keys(newRoomInfo.playerInfoList).length
            if (playerCount >= (newRoomInfo.maxUsers || 0)) {
              this.io?.emit('full-room', playerId)
            } else if (!newRoomInfo.lockedRoom) {
              this.io?.emit('unlocked-room', newRoomInfo)
            }

            // mixpanel.track('Accept Ring', {
            //   'email': client.email,
            //   'friend': playerId
            // })

            logger.info('accept-ring-friend', { sender: playerInfo, receiver: this.playerList.get(client.playerId || '') })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('ignore-ring-friend', (playerId) => {
        try {
          const playerClient = this.clients.get(playerId)
          const playerInfo = this.playerList.get(client.playerId || '')
          playerClient?.socket.emit('ignore-ring-friend', playerInfo?.name)

          logger.info('ignore-ring-friend', { sender: this.playerList.get(playerId), receiver: this.playerList.get(client.playerId || '') })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('invite-friend', async (playerId: string) => {
        try {
          const playerInfo = this.playerList.get(client.playerId || '')
          const playerClient = this.clients.get(playerId)

          if (playerClient?.roomId === client.address) {
            return
          }

          playerClient?.socket.emit('invite-friend', {
            playerId: client.playerId,
            name: playerInfo?.name,
            address: client.address,
          })

          // mixpanel.track('Send Friend Invitation', {
          //   'email': client.email,
          //   'friend': playerId
          // })

          logger.info('invite-friend', { sender: this.playerList.get(client.playerId || ''), receiver: this.playerList.get(playerId) })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('friend-msg', async (data: { friendId: string, msg: string }) => {
        try {
          const playerId = client.playerId || ''
          const chat = new friendChatModel({
            sender: playerId,
            receiver: data.friendId,
            msg: data.msg,
            viewed: false,
          })

          chat.save()
          const friend = this.clients.get(data.friendId)
          friend?.socket.emit('friend-msg', chat)
          socket.emit('friend-msg', chat)

          //Tracking the message being sent
          // mixpanel.track('Send Message', {
          //   'email': client.email,
          //   'friendId': data.friendId
          // })
        } catch (err) {
          console.log(err)
        }
      })

      //When a user views the message
      socket.on('friend-msg-viewed', async (friendId) => {
        try {
          const playerId = client.playerId || ''

          //Setting all messages to viewed when opened
          await friendChatModel.updateMany({
            viewed: false,
            sender: friendId,
            receiver: playerId
          }, {
            viewed: true
          })
        } catch (err) {
          console.log(err)
        }
      })

      //Checks how many messages are unread
      socket.on('desktop-badge-update', async function () {
        try {
          const playerId = client.playerId || ''

          //Finding all unread messages
          const unreadMsgs = await friendChatModel.count({
            viewed: false,
            receiver: playerId
          })

          socket.emit('desktop-badge-update', {
            unreadMsgs
          })
        } catch (err) {
          console.log(err)
        }
      })

      //Loads the user's chat history
      socket.on('friend-chat-history', async (friendId) => {
        try {
          const playerId = client.playerId || ''
          const chatHistory = await friendChatModel.find({
            $or: [{
              sender: playerId,
              receiver: friendId
            }, {
              sender: friendId,
              receiver: playerId
            }],
          }).sort({ createdAt: 1 })

          socket.emit('friend-chat-history', {
            friendId,
            chatHistory
          })
        } catch (err) {
          console.log(err)
        }
      })

      //Checks if the user has previous chats
      socket.on('check-chat-history', async (row) => {
        try {
          const playerId = client.playerId || ''

          var friendId
          if (row.receiver._id == playerId) {
            friendId = row.sender._id
          } else if (row.sender._id == playerId) {
            friendId = row.receiver._id
          }

          const chatHistory = await friendChatModel.findOne({
            $or: [{
              sender: playerId,
              receiver: friendId
            }, {
              sender: friendId,
              receiver: playerId
            }],
          })

          var existingChat = false
          //If not empty then send friend information to client
          if (chatHistory.length != 0) {
            existingChat = true
          }

          socket.emit('check-chat-history', {
            row, existingChat
          })
        } catch (err) {
          console.log(err)
        }
      })

      //Update bitmoji
      socket.on('update-bitmoji', async (playerId: string) => {
        try {
          if (!mongoose.Types.ObjectId.isValid(playerId)) {
            return
          }
          const userInfo = await userModel.findOne({
            _id: playerId
          })
          const playerInfo = this.playerList.get(playerId)

          if (userInfo && playerInfo) {
            playerInfo.name = userInfo.name
            playerInfo.avatar = userInfo.avatar

            this.emitHomeEvent(client.roomId || '', 'update-bitmoji', {
              id: playerInfo.id,
              name: playerInfo.name,
              avatar: playerInfo.avatar,
            })

            logger.info('update-bitmoji', { playerInfo })
          }
        } catch (err) {
          console.log(err)
        }
      })

      // Who Is game
      socket.on('who-is-vote', async (data: any) => {
        try {
          this.emitRoomEvent(data.gameRoomId, 'who-is-vote', data)
          const game = this.whoIsGameList.get(data.gameRoomId)
          if (game) {
            const exist = await whoIsDataModel.findOne({
              gameRoomId: data.gameRoomId,
              roundNumber: data.num + 1,
              userId: data.playerId
            })
            if (exist) {
              exist.numOfVotes++
              await exist.save()
            } else {
              const totalPlayers = this.roomList.get(client.roomId || '')?.offeredGames[data.gameRoomId].playerIds?.length
              const log = new whoIsDataModel({
                gameRoomId: data.gameRoomId,
                roundNumber: data.num + 1,
                question: game.questions[data.num].question,
                userId: data.playerId,
                numOfVotes: 1,
                winner: false,
                totalPlayers,
              })
              await log.save()
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('who-is-new-round', async (data: any) => {
        try {
          const game = this.whoIsGameList.get(data.gameRoomId)
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)
          const gameRoomId = client.gameRoomId || ''
          if (roomInfo && game && game.round !== data.round) {
            game.round = data.round
            this.emitRoomEvent(data.gameRoomId, 'who-is-new-round', data)
            if (data.winner) {
              await whoIsDataModel.updateMany({
                gameRoomId: data.gameRoomId,
                roundNumber: data.round,
                userId: data.winner
              }, {
                winner: true
              })
            }
            if (data.round >= parseInt(process.env.QUESTION_COUNT || '10')) {
              delete this.roomList.get(client.roomId || '')?.offeredGames[data.gameRoomId]
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('leave-game', () => {
        try {
          const roomId = client.roomId || ''
          const gameRoomId = client.gameRoomId || ''
          const playerId = client.playerId || ''
          this.leaveGameRoom(roomId, gameRoomId, playerId)
        } catch (err) {
          console.log(err)
        }
      })

      // Doodly game
      socket.on('sketch-width', (data: { gameRoomId: string }) => {
        this.emitRoomEvent(data.gameRoomId, 'sketch-width', data)
      })

      socket.on('drawing', (data: { gameRoomId: string }) => {
        this.emitRoomEvent(data.gameRoomId, 'drawing', data)
      })

      socket.on('finish-drawing', (data: { gameRoomId: string }) => {
        this.emitRoomEvent(data.gameRoomId, 'finish-drawing', data)
      })

      socket.on('change-color', (data: { gameRoomId: string }) => {
        this.emitRoomEvent(data.gameRoomId, 'change-color', data)
      })

      socket.on('change-tool', (data: { gameRoomId: string }) => {
        this.emitRoomEvent(data.gameRoomId, 'change-tool', data)
      })

      socket.on('select-word', (data: { gameRoomId: string }) => {
        this.emitRoomEvent(data.gameRoomId, 'select-word', data)
      })

      socket.on('wrong-guess', (data: any) => {
        try {
          const game = this.doodlyGameList.get(data.gameRoomId)
          if (!game) {
            return
          }
          this.emitRoomEvent(data.gameRoomId, 'wrong-guess', data)
          const totalPlayers = this.roomList.get(client.roomId || '')?.offeredGames[data.gameRoomId].playerIds.length
          const log = new doodlyDataModel({
            gameRoomId: data.gameRoomId,
            roundNumber: game.round + 1,
            userId: client.playerId,
            word: data.selectedWord,
            guess: data.word,
            correct: false,
            totalPlayers,
          })
          log.save()
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('correct-guess', (data: any) => {
        try {
          const game = this.doodlyGameList.get(data.gameRoomId)
          if (!game) {
            return
          }
          this.emitRoomEvent(data.gameRoomId, 'correct-guess', data)
          if (game.points[data.playerId]) {
            game.points[data.playerId] += data.point
          } else {
            game.points[data.playerId] = data.point
          }
          const gameRoomInfo = this.roomList.get(client.roomId || '')?.offeredGames[data.gameRoomId]
          if (gameRoomInfo) {
            const totalPlayers = gameRoomInfo.playerIds.length
            const log = new doodlyDataModel({
              gameRoomId: data.gameRoomId,
              roundNumber: game.round + 1,
              userId: client.playerId,
              word: data.selectedWord,
              guess: data.word,
              correct: true,
              totalPlayers,
            })
            log.save()
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('doodly-new-round', (data: { round: number }) => {
        try {
          const gameRoomId = client.gameRoomId || ''
          const game = this.doodlyGameList.get(gameRoomId)
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)
          if (roomInfo && game && game.round !== data.round) {
            game.round = data.round
            this.emitRoomEvent(gameRoomId, 'doodly-new-round', data)
            if (data.round >= game.roundCnt) {
              this.doodlyGameList.delete(gameRoomId)
              delete this.roomList.get(client.roomId || '')?.offeredGames[gameRoomId]
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      // UWO game
      socket.on('put-card', (data: { cardIds: string[], selectedColor: CardColors }) => {
        try {
          const gameExists = UwoGameService.gameExists(client.gameRoomId || '')
          if (gameExists) {
            UwoGameService.putCard((client.playerId || ''), data.cardIds, (client.gameRoomId || ''), data.selectedColor, false)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('uwoCall-check', () => {
        try {
          const gameExists = UwoGameService.gameExists(client.gameRoomId || '')
          if (gameExists) {
            UwoGameService.uwoCallCheck((client.playerId || ''), (client.gameRoomId || ''))
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('toggle-ready', () => {
        try {
          const gameExists = UwoGameService.gameExists(client.gameRoomId || '')
          if (gameExists) {
            UwoGameService.toggleReady((client.playerId || ''), (client.gameRoomId || ''))
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('change-player-status', (playerStatus: PlayerStatus) => {
        try {
          const gameExists = UwoGameService.gameExists(client.gameRoomId || '')
          if (gameExists) {
            UwoGameService.changePlayerStatus((client.gameRoomId || ''), (client.playerId || ''), playerStatus)
          }
        } catch (err) {
          console.log(err)
        }
      })

      // PB n J
      socket.on('choose-white-card', (text) => {
        againstHumanity.selectCard(client.gameRoomId, client.playerId, text)
      })

      socket.on('choose-review-card', (text) => {
        try {
          const roomId = client.roomId || ''
          const gameRoomId = client.gameRoomId || ''

          againstHumanity.selectWinner(gameRoomId, text)
        } catch (err) {
          console.log(err)
        }
      })

      // Love or hate
      socket.on('choose-state', (state: string) => {
        try {
          const gameRoomId = client.gameRoomId || ''
          const game = this.loveHateGameList.get(gameRoomId)
          if (game) {
            this.emitRoomEvent(gameRoomId, 'choose-state', {
              playerId: client.playerId,
              state
            })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('love-hate-new-round', (round: number) => {
        try {
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)
          const gameRoomId = client.gameRoomId || ''
          const game = this.loveHateGameList.get(gameRoomId)
          if (roomInfo && game && game.round == round) {
            game.round++
            this.emitRoomEvent(gameRoomId, 'love-hate-new-round', game.round)
            if (game.round > parseInt(process.env.QUESTION_COUNT || '10')) {
              const playerIds = roomInfo.offeredGames[gameRoomId].playerIds
              if (roomInfo && playerIds) {
                for (const playerId of playerIds) {
                  if (roomInfo.playerInfoList[playerId]) {
                    roomInfo.playerInfoList[playerId].gameState = ''
                  }
                  const client = this.clients.get(playerId)
                  if (client) {
                    client.gameRoomId = undefined
                    client.gameType = undefined
                    client.socket.leave(gameRoomId)
                  }
                }
              }
              this.loveHateGameList.delete(gameRoomId)
              delete roomInfo.offeredGames[gameRoomId]
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      // Guess Who
      socket.on('guess-who-finish-input', (statements: string[]) => {
        try {
          const gameRoomId = client.gameRoomId || ''
          const game = this.guessWhoGameList.get(gameRoomId)
          const playerId = client.playerId
          if (!game || !playerId) {
            return
          }

          if (game.statements[playerId]) {
            return
          }

          for (let i = 0; i < statements.length; i++) {
            if (game.choices.includes(statements[i])) {
              socket.emit('guess-who-duplicate-statement', i)
              return
            }
          }
          game.statements[playerId] = statements
          game.choices = game.choices.concat(statements)
          if (game.choices.length >= game.playerCnt * 3) {
            game.choices = this.chooseRandArr(game.choices, game.choices.length)
            this.emitRoomEvent(gameRoomId, 'guess-who-new-round', { round: 0, statement: game.choices[0] })
          } else {
            this.emitRoomEvent(gameRoomId, 'guess-who-finish-input', playerId)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('guess-who-new-round', (round: number) => {
        try {
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)
          const gameRoomId = client.gameRoomId || ''
          const game = this.guessWhoGameList.get(gameRoomId)
          if (roomInfo && game && game.round == round) {
            game.round++
            this.emitRoomEvent(gameRoomId, 'guess-who-new-round', { round: game.round, statement: game.choices[game.round] })
            if (game.round >= game.choices.length) {
              this.emitRoomEvent(gameRoomId, 'guess-who-end-game')
              const playerIds = roomInfo.offeredGames[gameRoomId].playerIds
              if (roomInfo && playerIds) {
                for (const playerId of playerIds) {
                  if (roomInfo.playerInfoList[playerId]) {
                    roomInfo.playerInfoList[playerId].gameState = ''
                  }
                  const client = this.clients.get(playerId)
                  if (client) {
                    client.gameRoomId = undefined
                    client.gameType = undefined
                    client.socket.leave(gameRoomId)
                  }
                }
              }
              this.guessWhoGameList.delete(gameRoomId)
              delete roomInfo.offeredGames[gameRoomId]
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('guess-who-vote', (data: { round: Number, playerId: string, gameRoomId: string }) => {
        this.emitRoomEvent(data.gameRoomId, 'guess-who-vote', data)
      })

      // Codename game
      socket.on('codename-flip', (pos: number) => {
        try {
          const gameRoomId = client.gameRoomId || ''
          const game = this.codenameGameList.get(gameRoomId)
          const playerId = client.playerId
          if (!game || !playerId) {
            return
          }

          const currentWord = game.words[pos]

          if (game.state === 'end' || currentWord.flipped) {
            return
          }

          currentWord.flipped = true
          let switchTeam = false

          switch (currentWord.type) {
            case 'death':
              game.score[game.currentTeam] = 0
              game.state = 'end'
              break
            case 'netural':
              game.currentTeam = game.currentTeam === 'red' ? 'blue' : 'red'
              switchTeam = true
              break
            default:
              game.score[currentWord.type]++
              if (game.score[currentWord.type] >= game.cardCnt[currentWord.type]) {
                game.state = 'end'
                game.currentTeam = currentWord.type
              } else if (currentWord.type !== game.currentTeam) {
                game.currentTeam = game.currentTeam === 'red' ? 'blue' : 'red'
                switchTeam = true
              }
              break
          }
          this.emitRoomEvent(gameRoomId, 'codename-flip', {
            // playerId,
            pos,
            currentTeam: game.currentTeam,
            score: game.score,
            state: game.state,
            switchTeam
          })
          if (game.state === 'end') {
            const roomInfo = this.roomList.get(client.roomId || '')
            this.codenameGameList.delete(gameRoomId)
            delete roomInfo?.offeredGames[gameRoomId]
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('submit-clue', (data) => {
        const gameRoomId = client.gameRoomId || ''
        this.emitRoomEvent(gameRoomId, 'submit-clue', data)
      })

      // Stand Air-hockey game
      socket.on('goto-air-hockey', (data: any) => {
        try {
          const playerId = client.playerId
          const gameRoomId = client.gameRoomId || ''
          const game = this.airHockeyGameList.get(gameRoomId)
          if (!playerId || !game) {
            return
          }
          game.join(playerId)
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('leave-air-hockey', (data: any) => {
        try {
          const playerId = client.playerId
          const gameRoomId = client.gameRoomId || ''
          const game = this.airHockeyGameList.get(gameRoomId)
          if (!playerId || !game) {
            return
          }
          game.leave(playerId)
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('start-air-hockey', (data: any) => {
        try {
          const playerId = client.playerId
          const gameRoomId = client.gameRoomId || ''
          const game = this.airHockeyGameList.get(gameRoomId)
          if (!playerId || !game) {
            return
          }
          game.start(playerId)
        } catch (err) {
          console.log(err)
        }
      })

      // Air-hockey game
      socket.on('air-hockey-info', (data: any) => {
        try {
          const playerId = client.playerId
          const gameRoomId = client.gameRoomId || ''
          const game = this.airHockeyGameList.get(gameRoomId)
          if (!playerId || !game) {
            return
          }
          game.onUpdate(playerId, data)
        } catch (err) {
          console.log(err)
        }
      })

      // Sockets for play youtube video
      socket.on('search-video', async (str: string) => {
        try {
          //Number of results from search
          var searchResults = 20

          //YT search settings
          var search = await ytsr(str, {
            limit: 20,
            pages: 1,
            gl: 'US',
            hl: 'en'
          })

          //Checks that the search outputted results
          if (!search || !search.items) {
            socket.emit('search-video')
          } else {
            var counter = 0
            while (counter < searchResults) {
              var currentVideo = search.items[counter]
              //Checks that the result is a video
              if (currentVideo.type == 'video') {
                //Sends the video info to the client
                socket.emit('search-video', {
                  yid: (currentVideo as ytsr.Video).id,
                  title: (currentVideo as ytsr.Video).title,
                })
              }
              counter += 1
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('select-video', async (videoId: string) => {
        try {
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)

          if (!roomInfo) {
            return
          }

          this.emitHomeEvent(roomId, 'select-video', videoId)
          roomInfo.selectedVideo = videoId
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('guest-can-play-song', (val) => {
        try {
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)
          if (roomInfo) {
            roomInfo.guestCanPlayVideo = val
            this.emitHomeEvent(roomId, 'guest-can-play-song', val)
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('play-pause-video', (val) => {
        try {
          const roomId = client.roomId || ''
          const roomInfo = this.roomList.get(roomId)
          if (roomInfo) {
            roomInfo.playingVideo = val
            this.emitHomeEvent(roomId, 'play-pause-video', val)
          }
        } catch (err) {
          console.log(err)
        }
      })

      // Socket related to winner & coin
      socket.on('winner', async () => {
        try {
          const gameRoomId = client.gameRoomId
          const gameType = client.gameType
          const playerId = client.playerId
          if (gameRoomId && gameType && playerId && mongoose.Types.ObjectId.isValid(playerId)) {
            const user = await userModel.findOne({
              _id: playerId
            })
            if (user) {
              const coinLog = new coinLogModel({
                userId: playerId,
                gameRoomId: gameRoomId,
                gameType: gameType,
                coins: 300
              })
              coinLog.save()

              if (user.coins === undefined) {
                user.coins = 300
              } else {
                user.coins += 300
              }
              user.save()


              this.clients.get(playerId)?.socket.emit('earned-coin', {
                add: 300,
                total: user.coins
              })
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      // Sockets realted to home desgin
      socket.on('home-to-design', async () => {
        try {
          const playerId = client.playerId || ''
          const playerInfo = this.playerList.get(playerId)
          const roomId = client.address
          const roomInfo = this.roomList.get(roomId)
          const desginRoom = this.roomList.get(`${client.address}-design`)

          if (playerId && playerInfo && roomId && roomInfo && desginRoom) {
            // Leave room
            const playerInfoList = roomInfo.playerInfoList
            const seatStateList = roomInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId].seatPos
            if (playerInfoList[playerId] && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
              playerInfo.seatTableId = undefined
              playerInfo.seatPos = undefined
            }
            delete playerInfoList[playerId]
            socket.leave(roomId)
            this.emitHomeEvent(roomId, 'remove-player', playerId)

            // Join design room
            // playerInfo.posX = this.startPos.home.x
            // playerInfo.posY = this.startPos.home.y
            playerInfo.seatTableId = undefined
            playerInfo.seatPos = undefined
            desginRoom.playerInfoList = {}
            desginRoom.playerInfoList[playerId] = playerInfo
            client.roomId = `${client.address}-design`

            socket.join(`${client.address}-design`)
            socket.emit('player-list', {
              playerList: desginRoom.playerInfoList,
              seats: {
                posList: []
              },
              scene: 'home-design',
              inventories: roomInfo.inventories,
              furnitureList: roomInfo.furnitureList,
              roomId: client.roomId
            })
            socket.join('home-design')

            logger.info('home-to-design', { playerInfo, roomInfo: this.copyRoomInfo(roomInfo) })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('design-to-home', async (inventories: object) => {
        try {
          const playerId = client.playerId || ''
          if (client.roomId !== `${client.address}-design`) {
            logger.debug('design-to-home', { playerInfo: this.playerList.get(client.playerId || ''), roomId: client.roomId })
            return
          }

          const playerInfo = this.playerList.get(playerId)
          const roomInfo = this.roomList.get(client.address)
          const desingRoom = this.roomList.get(`${client.address}-design`)


          if (roomInfo && inventories && mongoose.Types.ObjectId.isValid(playerId)) {
            userModel.findOneAndUpdate({
              _id: playerId,
            }, {
              inventories
            }, {
              new: true,
              upsert: true
            }).exec()
            roomInfo.inventories = inventories
          }

          logger.info('design-to-home', { playerInfo, desingRoom, roomInfo })

          if (playerId && playerInfo && desingRoom) {
            // Leave design room
            desingRoom.playerInfoList = {}
            socket.leave(`${client.address}-design`)
            this.emitHomeEvent(`${client.address}-design`, 'remove-player', playerId)

            if (client.address && roomInfo) {
              // Join room
              playerInfo.posX = this.startPos.home.x
              playerInfo.posY = this.startPos.home.y
              this.emitHomeEvent(client.address, 'add-player', playerInfo)
              roomInfo.playerInfoList[playerId] = playerInfo
              client.roomId = client.address

              socket.emit('player-list', {
                playerList: roomInfo.playerInfoList,
                scene: 'home',
                inventories: roomInfo.inventories,
                roomId: client.roomId
              })
              socket.join(client.address)

              const playerCount = Object.keys(roomInfo.playerInfoList).length
              if (playerCount >= (roomInfo.maxUsers || 0)) {
                this.io?.emit('full-room', playerId)
              } else if (!roomInfo.lockedRoom) {
                this.io?.emit('unlocked-room', roomInfo)
              }
            } else {
              client.roomId = ''
              socket.emit('empty-home')

              logger.debug('empty-home', { roomId: client.roomId, owner: this.clients.get(roomInfo?.ownerId || '') })
            }
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('buy-furniture', async (name: string) => {
        try {
          const playerId = client.playerId || ''
          if (!mongoose.Types.ObjectId.isValid(playerId)) {
            return
          }
          const user = await userModel.findOne({
            _id: playerId
          })
          if (furnitureList[name] && furnitureList[name].price <= user.coins) {
            const roomInfo = this.roomList.get(client.address)
            const ownFurnitureList: any = roomInfo?.furnitureList

            //Updating the user's inventory and coins
            if (ownFurnitureList[name]) {
              ownFurnitureList[name]++
            } else {
              ownFurnitureList[name] = 1
            }
            user.furnitureList = ownFurnitureList
            user.coins -= furnitureList[name].price
            user.save()

            //Sending tracking data to mixpanel
            // mixpanel.track('Buy Furniture', {
            //   'email': client.email,
            //   'itemName': name,
            //   'coinBalance': user.coins
            // })

            socket.emit('buy-furniture', {
              coins: user.coins,
              name,
            })
          }
        } catch (err) {
          console.log(err)
        }
      })

      //Gets the user's profile for the right click menu - currently only for number of friends (verified, bio in the future)
      socket.on('get-user-profile', async (playerId: string) => {
        try {
          //Checks that the playerId is valid
          playerId = playerId || ''
          if (!mongoose.Types.ObjectId.isValid(playerId)) {
            return
          }

          //Counts all the users that the user is friends with
          var totalFriendsNum = await friendModal.count({
            $or: [{
              sender: mongoose.Types.ObjectId(playerId)
            }, {
              receiver: mongoose.Types.ObjectId(playerId)
            }],
            receive_date: { $ne: null }
          })


          //Gets user data
          const player = await userModel.findOne({
            _id: playerId
          })

          //Gets the user's verified status
          const verifiedStatus = player.verified

          //Gets the user's bio
          const bio = player.bio

          socket.emit('get-user-profile', {
            totalFriendsNum,
            verifiedStatus,
            bio
          })
        } catch (err) {
          console.log(err)
        }
      })


      //Gets the user's profile for the right click menu - currently only for number of friends (verified, bio in the future)
      socket.on('check-daily-reward', async (playerId: string) => {
        try {
          //Gets player id
          playerId = playerId || ''

          //Gets user data
          const player = await userModel.findOne({
            _id: playerId
          })

          //Sets the last time the user claimed
          var lastClaimedDate = player.dailyRewardLastClaimed

          //Gets different times (current time, 24 hrs ago)
          var timeNow = Math.round(new Date().getTime() / 1000)
          var timeYesterday = timeNow - (24 * 3600)

          //Checks if the claim is valid
          var validClaim = lastClaimedDate <= new Date(timeYesterday * 1000).getTime()

          //If it's a valid claim or the user's first time claiming
          if (validClaim || player.dailyRewardTotal == 0) {
            validClaim = true
            socket.emit('check-daily-reward', {
              validClaim
            })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('claim-daily-reward', async (playerId: string) => {
        try {
          //Gets player id
          playerId = playerId || ''

          //Gets user data
          const player = await userModel.findOne({
            _id: playerId
          })

          //Sets the last time the user claimed
          var lastClaimedDate = player.dailyRewardLastClaimed

          //Gets different times (current time, 24 hrs ago, 48 hrs ago)
          var timeNow = Math.round(new Date().getTime() / 1000)
          var timeYesterday = timeNow - (24 * 3600)
          var timeDayBeforeYesterday = timeNow - (48 * 3600)

          //Checks if the claim is valid
          var validClaim = lastClaimedDate <= new Date(timeYesterday * 1000).getTime()

          //Checks if the user has an update streak claimed in the last 2 days
          var updateStreak = lastClaimedDate >= new Date(timeDayBeforeYesterday * 1000).getTime()

          //If it's a valid claim or the user's first time claiming
          if (validClaim || player.dailyRewardTotal == 0) {
            //Setting it as true for the first time a user claims
            validClaim = true

            //Possible prizes
            var coinPrizes = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 150, 150, 150, 150, 150, 150, 200, 200, 250]

            //Decides how many coins the user wins
            var winAmount = coinPrizes[Math.floor(Math.random() * coinPrizes.length)];

            //Updates variables
            player.coins += winAmount
            player.dailyRewardLastClaimed = new Date()
            player.dailyRewardTotal += 1

            //Checks if the user has an update streak
            var coinMultipliers = [1, 1.2, 1.3, 1.5, 1.7, 1.8, 2]
            var tomorrowMultiplier
            var multiplierAmount
            var totalWinAmount
            var tomorrowMultiplierIndex
            if (updateStreak) {
              //Checks if daily reward is greater than 7 days
              if (player.dailyRewardStreak >= 7) {
                multiplierAmount = coinMultipliers[6]
                tomorrowMultiplier = coinMultipliers[6]
              } else {
                //If they don't then match multiplier to days
                tomorrowMultiplierIndex = player.dailyRewardStreak + 1
                tomorrowMultiplier = coinMultipliers[tomorrowMultiplierIndex]
                multiplierAmount = coinMultipliers[player.dailyRewardStreak]
              }

              totalWinAmount = winAmount * multiplierAmount

              player.dailyRewardStreak += 1
              player.coins += totalWinAmount
            } else {
              tomorrowMultiplier = coinMultipliers[1]
              multiplierAmount = 1
              totalWinAmount = winAmount
              player.dailyRewardStreak = 1
              player.coins += winAmount
            }
            player.save()


            // mixpanel.track('Daily Reward', {
            //   'email': client.email,
            //   'winAmount': winAmount,
            //   'totalWinAmount': totalWinAmount,
            //   'multiplier': multiplierAmount,
            //   'coinBalance': player.coins
            // })


            //Sends information to client
            var totalCoins = player.coins
            socket.emit('claim-daily-reward', {
              validClaim, totalCoins, winAmount, multiplierAmount, totalWinAmount, tomorrowMultiplier
            })
          } else {
            //Returns valid claim as false to client
            socket.emit('claim-daily-reward', {
              validClaim
            })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('get-shop-items', async () => {
        try {
          var shopItems = await shopModal.find()

          socket.emit('get-shop-items', {
            shopItems
          })

          // Can be used to create an admin panel, only shows items not active to admins. 
          // var counter = 0
          // while (counter < shopItems.length) {
          //   var itemNow = shopItems[counter]
          //   if (itemNow.active) {
          //     console.log(itemNow)
          //   }

          //   counter +=1
          // }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('get-mutual-friends', async (playerId: string) => {
        try {
          //Stores the user requesting this data
          var ownId = playerId.toString()

          //Function to gets the users friends in array form
          async function checkFriends(searchingId: string) {

            //Gets all friends
            var friends_raw = await friendModal.find({
              $or: [{
                sender: mongoose.Types.ObjectId(searchingId)
              }, {
                receiver: mongoose.Types.ObjectId(searchingId)
              }]
            })


            //Creates an array with the user's friends
            var friends = []
            var counter = 0
            var friendId;
            while (counter < friends_raw.length) {
              var sender = (friends_raw[counter].sender).toString()
              var receiver = (friends_raw[counter].receiver).toString()
              //Checks if the user is a receiver
              if (sender != searchingId) {
                friendId = sender
              } else {
                friendId = receiver
              }


              if (friendId != ownId) {
                friends.push(friendId)
              }
              counter += 1
            }
            return friends
          }

          //Gets the users friends
          var myFriends = await checkFriends(ownId)

          //Gets the all friends of the users friends
          var friendCounter = 0
          var allUsers = myFriends
          while (friendCounter < myFriends.length) {
            var checkUserFriends = await checkFriends(myFriends[friendCounter])
            allUsers = allUsers.concat(checkUserFriends)
            friendCounter += 1
          }

          //Gets all the friends of the friends, that the user is friends with
          var friendCounter = 0
          var userCount = allUsers.length
          while (friendCounter < userCount) {
            var checkUserFriends = await checkFriends(allUsers[friendCounter])
            allUsers = allUsers.concat(checkUserFriends)
            friendCounter += 1
          }

          //Removes users that the user is already friends with
          var filteredUsers = allUsers.filter(item => myFriends.indexOf(item) === -1)

          //Sorts mutual friends, and the number of friends they have in common
          var map = filteredUsers.reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map())
          var mutualFriends = [...map.entries()]

          if (mutualFriends.length > 5) {
            var currentIndex = mutualFriends.length, randomIndex

            //Shuffles the array
            while (currentIndex != 0) {

              // Pick a remaining element...
              randomIndex = Math.floor(Math.random() * currentIndex)
              currentIndex--;

              // And swap it with the current element.
              [mutualFriends[currentIndex], mutualFriends[randomIndex]] = [
                mutualFriends[randomIndex], mutualFriends[currentIndex]]
            }

            //Makes sure to only send 5 friend suggestions
            while (mutualFriends.length > 5) {
              mutualFriends.pop()
            }
          }

          if (mutualFriends.length != 0) {
            socket.emit('get-mutual-friends', {
              mutualFriends
            })
          } else {
            console.log("No friend suggestions")
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('get-friend-suggestion-data', async (playerId: string) => {
        try {
          //Gets user data
          const player = await userModel.findOne({
            _id: playerId
          })

          var name = player.name
          var friendId = playerId
          var avatar = player.avatar
          socket.emit('get-friend-suggestion-data', {
            name, friendId, avatar
          })
        } catch (err) {
          console.log(err)
        }
      })

      //Checks friends that the user can send coins to
      socket.on('get-coin-send-ability', async (friends: any) => {
        try {
          //Initializing variables
          var ownId = client.playerId
          var friendGifts = []
          var friendNames = []
          var counter = 0

          //Gets different times (current time, 24 hrs ago)
          var timeNow = Math.round(new Date().getTime() / 1000)
          var timeYesterday = timeNow - (24 * 3600)

          //Checks if there are any gifts from each friend
          while (counter < friends.length) {
            //Searches db for gift sent to the current friend
            const recentGift = await coinGifts.findOne({
              receiver: friends[counter],
              sender: ownId
            }).sort({ "send_date": -1 }).limit(1)

            //Checks if the user has sent a gift before to the friend
            if (recentGift == null) {
              //If they haven't sent a gift then set validGift as true
              validGift = true
            } else {
              //Checks if the recent gift was sent in the last 24 hours
              var validGift = recentGift.send_date <= new Date(timeYesterday * 1000).getTime()
            }

            //If gift can be sent
            if (validGift == true) {
              //Get the friend's name
              const player = await userModel.findOne({
                _id: friends[counter]
              })

              var currentFriendName = player.name

              //Adds the friend name & id to seperate arrays
              friendNames.push(currentFriendName)
              friendGifts.push(friends[counter])
            }

            counter += 1
          }

          //Sends the data to the client
          socket.emit('get-coin-send-ability', {
            friendGifts, friendNames
          })
        } catch (err) {
          console.log(err)
        }
      })

      //When the user is sending a gift
      socket.on('send-coin-gift', async (playerId: string) => {
        try {
          //Gets player id
          var ownId = client.playerId
          playerId = playerId || ''

          //Gets gift data
          const recentGift = await coinGifts.findOne({
            sender: ownId,
            receiver: playerId
          }).sort({ "send_date": -1 }).limit(1)

          //Gets different times (current time, 24 hrs ago)
          var timeNow = Math.round(new Date().getTime() / 1000)
          var timeYesterday = timeNow - (24 * 3600)

          //Checks if the user has sent a gift
          if (recentGift == null) {
            //If they haven't sent a gift then set validGift as true
            validGift = true
          } else {
            //Checks if the recent gift was sent in the last 24 hours
            var validGift = recentGift.send_date <= new Date(timeYesterday * 1000).getTime()
          }

          //If it's a validGift then send the gift
          if (validGift) {
            coinGifts.create({ sender: ownId, receiver: playerId, send_date: new Date(), exists: true })
          }

          // mixpanel.track('Send Coin Gift', {
          //   'email': client.email,
          //   'friend': playerId,
          //   'validGift': validGift
          // })

          socket.emit('send-coin-gift', {
            validGift
          })
        } catch (err) {
          console.log(err)
        }
      })

      //Checks whether the user has any gifts received
      socket.on('get-coin-gifts', async (friends: any) => {
        try {
          //Initializing variables
          var ownId = client.playerId
          var friendGifts = []
          var friendNames = []
          var counter = 0

          //Checks if there are any gifts from each friend
          while (counter < friends.length) {
            //Searches db for gift sent by the current friend
            const recentGift = await coinGifts.findOne({
              receiver: ownId,
              sender: friends[counter],
              receive_date: null,
              exists: true
            }).sort({ "send_date": -1 }).limit(1)

            //If gift is found then push it to the friendGifts array
            if (recentGift != null) {
              //Get the friend's name
              const player = await userModel.findOne({
                _id: friends[counter]
              })

              var currentFriendName = player.name

              //Adds the friend name & id to seperate arrays
              friendNames.push(currentFriendName)
              friendGifts.push(recentGift.sender)
            }

            counter += 1
          }

          //Sends the data to the front end
          socket.emit('get-coin-gifts', {
            friendGifts, friendNames
          })
        } catch (err) {
          console.log(err)
        }
      })

      //When the user requests to claim a gift
      socket.on('claim-coin-gift', async (playerId: string) => {
        try {
          var ownId = client.playerId
          var playerId = playerId || ''

          //Checks if the user has a gift
          const recentGift = await coinGifts.findOne({
            receiver: ownId,
            sender: mongoose.Types.ObjectId(playerId),
            receive_date: null
          }).sort({ "send_date": -1 }).limit(1)

          //If the user is claiming the gift and their gift exists
          if (recentGift.exists) {
            var coinWins = [25, 25, 25, 50, 50, 75]

            //Gets user data
            const player = await userModel.findOne({
              _id: ownId
            })

            //Decides how many coins the user gets
            var winAmount = coinWins[Math.floor(Math.random() * coinWins.length)]

            //Updates the users coins
            player.coins += winAmount
            player.save()

            //Updates the claim date (aka receive_date)
            recentGift.receive_date = new Date()
            recentGift.save()

            //Sets it all to claimed
            await coinGifts.updateMany({
              receiver: ownId,
              sender: playerId
            }, {
              exists: false
            })

            // mixpanel.track('Claim Coin Gift', {
            //   'email': client.email,
            //   'friend': playerId,
            //   'winAmount': winAmount,
            //   'coinBalance': totalCoins
            // })

            //Sends the data to the front end
            var totalCoins = player.coins
            var friendId = playerId
            socket.emit('claim-coin-gift', {
              winAmount, totalCoins, friendId
            })
          }
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('get-events', async (playerId: string) => {
        try {
          var ownId = client.playerId
          var playerId = playerId || ''

          //Gets the current time and time minus 1 hour
          var timeNowMinusHour = new Date()
          timeNowMinusHour.setTime(timeNowMinusHour.getTime() - 3600000)

          //Searches for events that the user is invited to
          var event = await eventsModel.find({
            invites: ownId,
            canceled: false,
            eventTime: {
              $gt: timeNowMinusHour
            }
          }).sort({ eventTime: 1 })

          //Searches for the events that the user owns/created
          var eventsOwned = await eventsModel.find({
            eventCreator: ownId,
            canceled: false,
          }).sort({ eventTime: 1 })

          socket.emit('get-events', {
            event, eventsOwned
          })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('event-response-update', async (data: { eventId: string, eventResponse: boolean }) => {
        try {
          var ownId = client.playerId

          await eventInviteResponsesModel.findOneAndUpdate({
            userId: mongoose.Types.ObjectId(ownId),
            eventId: mongoose.Types.ObjectId(data.eventId)
          }, {
            coming: data.eventResponse
          }, {
            new: true,
            upsert: true
          }).exec()

          socket.emit('event-response-update')
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('get-event-details', async (eventId: string) => {
        try {
          var ownId = client.playerId

          //Searches for the event 
          var event = await eventsModel.findOne({
            _id: eventId
          })

          //Checks if the user is the event creator or just invited
          var eventType
          if (event.eventCreator == ownId) {
            eventType = 'creator'
          } else {
            eventType = 'invited'
          }

          //Getting player information
          var playerAvatar = []
          var playerName = []
          var playerId = []
          var playerComing = []
          var counter = 0
          while (counter < (event.invites).length) {
            var player = await userModel.findOne({
              _id: mongoose.Types.ObjectId(event.invites[counter])
            })

            var inviteResponse = await eventInviteResponsesModel.findOne({
              userId: mongoose.Types.ObjectId(event.invites[counter]),
              eventId: eventId
            })

            playerComing.push(inviteResponse.coming)
            playerAvatar.push(player.avatar)
            playerName.push(player.name)
            playerId.push(player._id)

            counter += 1
          }

          socket.emit('get-event-details', {
            event, eventType, playerAvatar, playerName, playerId, playerComing, inviteResponse
          })
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('get-richup', async () => {
        try {
          const roomId = client.roomId || ''

          //https://richup.io/room/new?isPrivate=true
          const options = {
            hostname: 'richup.io',
            port: 443,
            path: '/room/new?isPrivate=true',
            method: 'GET'
          }

          //Getting the rich up room id
          var richUpRoomId = ''
          const req = https.request(options, (res: any) => {

            //The room id returned
            res.on('data', (d: any) => {
              richUpRoomId += d
              richUpRoomId = (richUpRoomId.split('"')[3])

              if (!roomId) {
                return
              }

              this.emitHomeEvent(roomId, 'get-richup', richUpRoomId)
            })
          })

          req.on('error', (error: any) => {
            console.error("Error is ", error)
          })

          req.end()
        } catch (err) {
          console.log(err)
        }
      })

      socket.on('disconnect', () => {
        try {
          if (!client) {
            return
          }
          const playerId = client.playerId || ''
          const roomId = client.roomId || ''
          const gameRoomId = client.gameRoomId || ''
          if (gameRoomId) {
            this.leaveGameRoom(roomId, gameRoomId, playerId)
          }
          const roomInfo = this.roomList.get(roomId)
          if (roomId && roomInfo) {
            const playerInfoList = roomInfo.playerInfoList
            const seatStateList = roomInfo.seatStateList
            const playerSeatTableId = playerInfoList[playerId]?.seatTableId
            const playerSeatPos = playerInfoList[playerId]?.seatPos
            if (playerInfoList[playerId] && seatStateList && playerSeatTableId && playerSeatPos !== undefined && playerSeatPos !== null) {
              delete seatStateList[playerSeatTableId][playerSeatPos]
            }
            delete playerInfoList[playerId]
            this.emitHomeEvent(roomId, 'remove-player', playerId)
          }
          this.playerList.delete(playerId)
          this.clients.delete(playerId)

          this.sendNetworkStatus(playerId, false)
        } catch (err) {
          console.log(err)
        }
      })
    } catch (err) {
      console.log(err)
    }
  }

  private joinGameRoom(roomId: string, gameRoomId: string, playerId: string) {
    try {
      const client = this.clients.get(playerId)
      if (!client) {
        return
      }

      const roomInfo = this.roomList.get(roomId)
      const offeredGame = roomInfo?.offeredGames[gameRoomId]
      const playerIds = offeredGame?.playerIds

      if (roomInfo && offeredGame && playerIds) {
        if (playerIds?.includes(playerId)) {
          return
        }

        if (offeredGame.gameType === 'air-hockey' && playerIds.length === 1) {
          playerIds.push(playerId)
          roomInfo.playerInfoList[playerId || ''].gameState = 'accept'
          client.gameRoomId = gameRoomId
          client.gameType = offeredGame.gameType
          client.socket.join(gameRoomId)
          this.startGame(roomId, gameRoomId)
          return
        }

        if (offeredGame.gameType === 'air-hockey' && playerIds.length === 2) {
          client.socket.emit('waiting-next-game')
          return
        }

        // If gameType is lipoker, player can start the game
        if (offeredGame.gameType === 'lipoker') {
          playerIds.push(playerId)
          roomInfo.playerInfoList[playerId || ''].gameState = 'accept'
          client.gameRoomId = gameRoomId
          client.gameType = offeredGame.gameType
          client.socket.join(gameRoomId)
          this.startGame(roomId, gameRoomId)
          return
        }

        if (offeredGame.gameState === 'playing') {
          client.socket.emit('waiting-next-game')
          return
        }

        playerIds.push(playerId)
        roomInfo.playerInfoList[playerId || ''].gameState = 'accept'
        client.gameRoomId = gameRoomId
        client.gameType = offeredGame.gameType
        client.socket.join(gameRoomId)

        if (offeredGame.gameState === 'counting') {
          client.socket.emit('counting-game', { count: offeredGame.countDown, gameRoomId })
          return
        }

        //checkPlayers-Edit
        if (checkPlayers(offeredGame.gameType, playerIds.length) === false) {
          client.socket.emit('waiting-players', gameRoomId)
          return
        }

        offeredGame.countDown = 15
        offeredGame.gameState = 'counting'
        offeredGame.timer = setInterval(() => {
          offeredGame.countDown--;
          if (offeredGame.countDown == 0) {
            clearInterval(offeredGame.timer)
            this.startGame(roomId, gameRoomId)
          }
        }, 1000);

        this.emitRoomEvent(gameRoomId, 'counting-game', { count: offeredGame.countDown, gameRoomId })
      }
    } catch (err) {
      console.log(err)
    }
  }

  private async startGame(roomId: string, gameRoomId: string) {
    try {
      const roomInfo = this.roomList.get(roomId)
      const offeredGame = roomInfo?.offeredGames[gameRoomId]
      const joinedPlayerIds = offeredGame?.playerIds

      //checkPlayers-Edit
      if (!roomInfo || !offeredGame || !joinedPlayerIds || checkPlayers(offeredGame.gameType, joinedPlayerIds.length) == false) {
        return
      }

      offeredGame.gameState = 'playing'

      // Start game
      const data: any = {
        gameType: offeredGame.gameType,
        playerIds: joinedPlayerIds,
        gameRoomId,
        roundCnt: 0,
      }

      if (offeredGame.gameType === 'who-is') {
        data.questions = this.chooseRandArr(questions, parseInt(process.env.QUESTION_COUNT || '10'))
        data.round = 0
        this.whoIsGameList.set(gameRoomId, {
          questions: data.questions,
          round: 0
        })
      } else if (offeredGame.gameType === 'doodly') {
        if (joinedPlayerIds.length < 3) {
          data.roundCnt = joinedPlayerIds.length * 3
        } else {
          data.roundCnt = Math.round(joinedPlayerIds.length * 2)
        }
        data.words = this.chooseRandArr(words, 3 * data.roundCnt)
        this.doodlyGameList.set(gameRoomId, {
          words: data.words,
          roundCnt: data.roundCnt,
          round: 0,
          points: {}
        })
        this.clients.get(joinedPlayerIds[0])?.socket.emit('game-manager')
      } else if (offeredGame.gameType === 'uwo') {
        data.gameData = UwoGameService.setupGame(joinedPlayerIds, gameRoomId)
      } else if (offeredGame.gameType === 'humanity') {
        data.gameData = againstHumanity.createGame(joinedPlayerIds, gameRoomId)
      } else if (offeredGame.gameType === 'love-hate') {
        data.questions = this.chooseRandArr(phraseList, parseInt(process.env.QUESTION_COUNT || '10'))
        data.round = 0
        this.loveHateGameList.set(gameRoomId, {
          questions: data.questions,
          round: 0,
          gameManager: joinedPlayerIds[0]
        })
        this.clients.get(joinedPlayerIds[0])?.socket.emit('game-manager')
      } else if (offeredGame.gameType === 'guess-who') {
        data.round = 0
        this.guessWhoGameList.set(gameRoomId, {
          statements: {},
          choices: [],
          round: 0,
          gameManager: joinedPlayerIds[0],
          playerCnt: joinedPlayerIds.length
        })
        this.clients.get(joinedPlayerIds[0])?.socket.emit('game-manager')
      } else if (offeredGame.gameType === 'codename') {
        // data.round = 0
        const typeList: ("red" | "blue" | "netural" | "death")[] = ['red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'netural', 'netural', 'netural', 'netural', 'netural', 'netural', 'netural', 'death']

        data.currentTeam = Math.random() > 0.5 ? 'red' : 'blue'

        typeList.push(data.currentTeam)

        let randWords: CodenameWord[] = []
        this.chooseRandArr(codenameWords, 25).forEach((w, idx) => {
          randWords.push({
            word: w,
            type: typeList[idx],
            flipped: false
          })
        })
        randWords = this.chooseRandArr(randWords, 25)

        const team: { [index: string]: "red" | "blue" } = {}
        const shufflePlayerIds = this.chooseRandArr(joinedPlayerIds, joinedPlayerIds.length)
        const spyMasters = {
          blue: shufflePlayerIds[0],
          red: shufflePlayerIds[1]
        }

        shufflePlayerIds.forEach((playerId, idx) => {
          if (idx % 2) {
            team[playerId] = 'red'
          } else {
            team[playerId] = 'blue'
          }
        })

        this.codenameGameList.set(gameRoomId, {
          currentTeam: data.currentTeam,
          state: 'start',
          words: randWords,
          cardCnt: {
            red: data.currentTeam === 'red' ? 9 : 8,
            blue: data.currentTeam === 'blue' ? 9 : 8,
          },
          score: {
            red: 0,
            blue: 0
          },
          team,
          spyMasters
        })
        data.words = randWords
        data.team = team
        data.spyMasters = spyMasters
        this.clients.get(joinedPlayerIds[0])?.socket.emit('game-manager')
      } else if (offeredGame.gameType === 'air-hockey') {
        const airHockeyGame = new AirHockey(gameRoomId, offeredGame.playerIds[0], offeredGame.playerIds[1])
        this.airHockeyGameList.set(gameRoomId, airHockeyGame)
      }
      this.emitRoomEvent(gameRoomId, 'start-game', data)
      let totalPeopleInTable = 0
      for (const _seat in roomInfo.seatStateList[offeredGame.tableId]) {
        totalPeopleInTable++
      }
      const log = new gameRoomModel({
        gameRoomId,
        gameName: offeredGame.gameType === 'humanity' ? 'PB n J' : offeredGame.gameType,
        userId: joinedPlayerIds[0],
        players: joinedPlayerIds.length,
        totalPeopleInTable,
        homeOwnerId: roomInfo.ownerId,
        homeOwner: joinedPlayerIds[0] === roomInfo.ownerId,
      })
      log.save()

      for (const playerId of joinedPlayerIds) {
        if (mongoose.Types.ObjectId.isValid(playerId)) {
          const player = await userModel.findOne({
            _id: playerId
          })

          // if (player) {
          //   mixpanel.track('Game', {
          //     'email': player.email,
          //     'username': player.name,
          //     'game_name': offeredGame.gameType,
          //     'num_of_players': joinedPlayerIds.length
          //   })
          // }
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  private leaveGameRoom(roomId: string, gameRoomId: string, playerId: string) {
    try {
      const roomInfo = this.roomList.get(roomId)
      const offeredGame = roomInfo?.offeredGames[gameRoomId]
      const playerIds = offeredGame?.playerIds
      const client = this.clients.get(playerId)

      if (!roomInfo || !offeredGame || !client || !playerIds?.includes(playerId)) {
        return
      }

      playerIds.splice(playerIds.indexOf(playerId), 1)
      client.gameRoomId = undefined
      client.gameType = undefined
      if (roomInfo.playerInfoList[playerId]) {
        roomInfo.playerInfoList[playerId].gameState = ''
      }
      client.socket.leave(gameRoomId)

      if (!playerIds.length) {
        // Remove game room
        delete roomInfo.offeredGames[gameRoomId]
        return
      }

      //checkPlayers-edit
      if (checkPlayers(offeredGame.gameType, playerIds.length) === true && offeredGame.gameState === 'playing') {
        // Continue game
        if (offeredGame.gameType === 'who-is') {
          const game = this.whoIsGameList.get(gameRoomId)
          const data = {
            gameType: 'who-is',
            playerIds,
            gameRoomId,
            questions: game?.questions,
            round: game?.round
          }
          this.emitRoomEvent(gameRoomId, 'start-game', data)
        } else if (offeredGame.gameType === 'doodly') {
          const game = this.doodlyGameList.get(gameRoomId)
          const data = {
            gameType: 'doodly',
            playerIds,
            gameRoomId,
            words: game?.words,
            round: game?.round,
            roundCnt: game?.roundCnt,
            points: game?.points
          }
          this.emitRoomEvent(gameRoomId, 'start-game', data)
        } else if (offeredGame.gameType === 'uwo') {
          UwoGameService.purgePlayer(gameRoomId, playerId)
          this.emitRoomEvent(gameRoomId, 'update-uwo-game-player', playerIds)
        } else if (offeredGame.gameType === 'humanity') {
          const gameData = againstHumanity.leaveGame(gameRoomId, playerId)
          if (gameData) {
            const data: any = {
              gameType: 'humanity',
              playerIds,
              gameRoomId,
              gameData,
            }
            this.emitRoomEvent(gameRoomId, 'start-game', data)
          }
        } else if (offeredGame.gameType === 'love-hate') {
          const game = this.loveHateGameList.get(gameRoomId)
          if (game) {
            if (playerId === game.gameManager) {
              game.gameManager = playerIds[0]
              this.clients.get(playerIds[0])?.socket.emit('game-manager')
            }
            const data = {
              playerId,
              playerIds,
            }
            this.emitRoomEvent(gameRoomId, 'leave-game-player', data)
          }
        } else if (offeredGame.gameType === 'guess-who') {
          const game = this.guessWhoGameList.get(gameRoomId)
          if (game) {
            if (playerId === game.gameManager) {
              game.gameManager = playerIds[0]
              this.clients.get(playerIds[0])?.socket.emit('game-manager')
            }
            const data = {
              playerId,
              playerIds,
            }
            this.emitRoomEvent(gameRoomId, 'leave-game-player', data)
          }
        } else if (offeredGame.gameType === 'lipoker') {
          const data = {
            playerId,
            playerIds,
          }
          this.emitRoomEvent(gameRoomId, 'leave-game-player', data)
        }
        return
      }

      //checkPlayers-edit
      if (checkPlayers(offeredGame.gameType, playerIds.length) === false && offeredGame.gameState === 'counting') {
        offeredGame.gameState = 'waiting'
        this.emitRoomEvent(gameRoomId, 'cancel-counting', playerIds.length)
        clearInterval(offeredGame.timer)
        offeredGame.countDown = 15
        return
      }

      if (offeredGame.gameState === 'playing') {
        offeredGame.gameState = 'waiting'
        this.emitRoomEvent(gameRoomId, 'cancel-game', playerIds.length)
        // for (const playerId of playerIds) {
        //   if (roomInfo.playerInfoList[playerId]) {
        //     roomInfo.playerInfoList[playerId].gameState = ''
        //   }
        //   const client = this.clients.get(playerId)
        //   if (client) {
        //     client.gameRoomId = undefined
        //     client.gameType = undefined
        //     client.socket.leave(gameRoomId)
        //   }
        // }
        if (offeredGame.gameType === 'who-is') {
          this.whoIsGameList.delete(gameRoomId)
        } else if (offeredGame.gameType === 'doodly') {
          this.doodlyGameList.delete(gameRoomId)
        } else if (offeredGame.gameType === 'uwo') {
          UwoGameService.endGame(gameRoomId)
        } else if (offeredGame.gameType === 'love-hate') {
          this.loveHateGameList.delete(gameRoomId)
        } else if (offeredGame.gameType === 'guess-who') {
          this.guessWhoGameList.delete(gameRoomId)
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  private chooseRandArr(arr: any[], cnt: number) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr.slice(0, cnt)
  }

  private getWorldNum(): number {
    // Check if there's a world with less than "process.env.MIN_COUNT_PER_WORLD" users except 0 users
    for (const worldNum in this.playerCntInWorld) {
      const cnt = this.playerCntInWorld[worldNum]
      if (cnt > 0 && cnt < parseInt(process.env.MIN_COUNT_PER_WORLD || '2')) {
        return parseInt(worldNum)
      }
    }

    // Find the world with most users and less than "process.env.MAX_COUNT_PER_WORLD" users
    const mostUsersWorld = {
      worldNum: '0',
      playerCnt: 0
    }
    for (const worldNum in this.playerCntInWorld) {
      const cnt = this.playerCntInWorld[worldNum]
      if (cnt > 0 && cnt < parseInt(process.env.MAX_COUNT_PER_WORLD || '3') && cnt > mostUsersWorld.playerCnt) {
        mostUsersWorld.worldNum = worldNum
        mostUsersWorld.playerCnt = cnt
      }
    }
    if (mostUsersWorld.playerCnt) {
      return parseInt(mostUsersWorld.worldNum)
    }

    // Check if there's a world with 0 users
    for (const worldNum in this.playerCntInWorld) {
      const cnt = this.playerCntInWorld[worldNum]
      if (cnt === 0) {
        return parseInt(worldNum)
      }
    }

    // There isn't any world or all worlds are at max capacity, so create new world
    this.lastWorldNum++
    this.playerCntInWorld[this.lastWorldNum] = 0

    const emptyRoom: RoomInfo = {
      ownerId: '',
      playerInfoList: {},
      seatStateList: {},
      offeredGames: {},
      requirePassword: false,
      password: ''
    }

    this.roomList.set(`${this.lastWorldNum}-shop`, JSON.parse(JSON.stringify(emptyRoom)))
    this.roomList.set(`${this.lastWorldNum}-plaza`, JSON.parse(JSON.stringify(emptyRoom)))
    this.roomList.set(`${this.lastWorldNum}-pizza`, JSON.parse(JSON.stringify(emptyRoom)))

    return this.lastWorldNum
  }

  private async getFriendList(playerId: string) {
    try {
      if (!mongoose.Types.ObjectId.isValid(playerId)) {
        return {}
      }
      const friends = await friendModal.find({
        $or: [{
          sender: playerId
        }, {
          receiver: playerId
        }],
        receive_date: { $ne: null }
      }).populate('sender', ['name', 'avatar'])
        .populate('receiver', ['name', 'avatar'])

      const status: any = {}

      for (const friend of friends) {
        if (friend.sender._id != playerId) {
          status[friend.sender._id] = this.clients.has(friend.sender._id.toString())
        } else {
          status[friend.receiver._id] = this.clients.has(friend.receiver._id.toString())
        }
      }

      const pendingRequests = await friendModal.find({
        receiver: playerId,
        receive_date: null
      }).populate('sender', ['name', 'avatar'])

      return {
        friends,
        pendingRequests,
        status,
      }
    } catch (err) {
      console.log(err)
    }
  }

  private async sendNetworkStatus(playerId: string, status: boolean = true) {
    try {
      if (!mongoose.Types.ObjectId.isValid(playerId)) {
        return
      }
      const friends = await friendModal.find({
        $or: [{
          sender: playerId
        }, {
          receiver: playerId
        }],
        receive_date: { $ne: null }
      })

      for (const friend of friends) {
        let friendPlayerId
        if (friend.sender._id != playerId) {
          friendPlayerId = friend.sender._id.toString()
        } else {
          friendPlayerId = friend.receiver._id.toString()
        }
        this.clients.get(friendPlayerId)?.socket.emit('friend-status', {
          playerId,
          status,
        })
      }
    } catch (err) {
      console.log(err)
    }
  }

  private generateTwilioToken(playerId: string): string {
    const token = new AccessToken(
      `${process.env.TWILIO_ACCOUNT_SID}`,
      `${process.env.TWILIO_API_KEY_SID}`,
      `${process.env.TWILIO_API_KEY_SECRET}`
    )

    // Assign identity to the token
    token.identity = playerId

    // Grant the access token Twilio Video capabilities
    const grant = new VideoGrant()
    token.addGrant(grant)

    // Serialize the token to a JWT string
    return token.toJwt()
  }

  private updateTwilioToken(_this: ListenerService) {
    _this.clients.forEach(client => {
      const playerId = client.playerId || ''
      const token = _this.generateTwilioToken(playerId)
      client.socket.emit('twilio-token', token)
    })
  }

  private getPublicRoomList() {
    const filteredRoom = [...this.roomList].filter(([roomId, roomInfo]) => {
      const locked = roomInfo.lockedRoom
      const playerCount = Object.keys(roomInfo.playerInfoList).length
      return !locked && playerCount && playerCount < (roomInfo.maxUsers || 0) && roomInfo.ownerId && roomInfo.playerInfoList[roomInfo.ownerId]
    })
    return filteredRoom
  }

  emitHomeEvent(roomId: string, event: string, ...data: unknown[]) {
    try {
      const roomInfo = this.roomList.get(roomId)
      const playerInfoList = roomInfo?.playerInfoList
      if (roomInfo && playerInfoList) {
        for (const playerId in playerInfoList) {
          const playerSocket = this.clients.get(playerId)?.socket
          playerSocket?.emit(event, ...data)
        }
      }
    } catch (err) {
      console.log(err)
    }
  }

  emitRoomEvent(roomId: string, event: string, ...data: unknown[]) {
    this.io?.to(roomId).emit(event, ...data)
  }

  setSocketServer(socketServer: SocketServer) {
    // eslint-disable-next-line
    const socketWithDisabledBinary = (socketServer as any).binary(false)

    this.io = socketWithDisabledBinary as SocketServer
  }

  copyRoomInfo(roomInfo: RoomInfo) {
    try {
      const copy = Object.assign({}, roomInfo)
      for (const gameRoomId in copy.offeredGames) {
        delete copy.offeredGames[gameRoomId].timer
      }

      return copy
    } catch (err) {
      console.log(err)
    }
    return {}
  }

  endAirHockeyGame(gameRoomId: string) {
    this.emitRoomEvent(gameRoomId, 'air-hockey-end-game')
  }

  // private joinGamePlayer(roomId: string, gameRoomId: string, playerId: string) {
  //   const roomInfo = this.roomList.get(roomId)
  //   const client = this.clients.get(playerId)

  //   if (!roomInfo || !gameRoomId || !client) {
  //     return false
  //   }

  //   const joinedPlayerIds = roomInfo.offeredGames[gameRoomId]?.playerIds
  //   const gameType = roomInfo.offeredGames[gameRoomId]?.gameType

  //   if (gameType === 'uwo') {
  //     this.addGamePlayer(roomId, gameRoomId, playerId)
  //     return true
  //   }

  //   joinedPlayerIds.push(client.playerId || '')
  //   roomInfo.playerInfoList[client.playerId || ''].gameState = 'joined'
  //   client.gameRoomId = gameRoomId
  //   client.gameType = gameType

  //   this.emitRoomEvent(gameRoomId, 'join-game-player', {
  //     gameType,
  //     playerId,
  //   })

  //   let data: any = {
  //     gameType,
  //     playerIds: joinedPlayerIds,
  //     gameRoomId,
  //   }

  //   if (gameType === 'who-is') {
  //     const game = this.whoIsGameList.get(gameRoomId)
  //     if (game) {
  //       data = {
  //         ...data,
  //         questions: game.questions,
  //         round: game.round
  //       }
  //     }
  //   } else if (gameType === 'doodly') {
  //     const game = this.doodlyGameList.get(gameRoomId)
  //     if (game) {
  //       data = {
  //         ...data,
  //         words: game.words,
  //         points: game.points,
  //         round: game.round
  //       }
  //     }
  //   } else if (gameType === 'humanity') {
  //     const gameData = againstHumanity.joinPlayer(gameRoomId, playerId)
  //     if (gameData) {
  //       data = {
  //         ...data,
  //         gameData,
  //       }
  //     }
  //   } else if (gameType === 'love-hate') {
  //     const game = this.loveHateGameList.get(gameRoomId)
  //     if (game) {
  //       data = {
  //         ...data,
  //         round: game.round,
  //         questions: game.questions
  //       }
  //     }
  //   }
  //   client.socket.emit('join-game', data)

  //   return true
  // }

  // private addGamePlayer(roomId: string, gameRoomId: string, playerId: string) {
  //   const roomInfo = this.roomList.get(roomId)
  //   if (!roomInfo || !gameRoomId) {
  //     return false
  //   }

  //   const client = this.clients.get(playerId)
  //   const playerIds = roomInfo.offeredGames[gameRoomId]?.playerIds
  //   const gameType = roomInfo.offeredGames[gameRoomId]?.gameType
  //   if (!client || !playerIds || playerIds.length >= 10) {
  //     return false
  //   }
  //   playerIds.push(client.playerId || '')
  //   roomInfo.playerInfoList[client.playerId || ''].gameState = 'accept'
  //   client.gameRoomId = gameRoomId
  //   client.gameType = gameType
  //   client.socket.join(gameRoomId)

  //   if (gameType === 'uwo') {
  //     const gameExists = UwoGameService.gameExists(client.gameRoomId || '')
  //     if (gameExists) {
  //       UwoGameService.joinGame((client.gameRoomId || ''), (client.playerId || ''))
  //       this.emitRoomEvent(gameRoomId, 'update-uwo-game-player', playerIds)
  //     }

  //     const data: any = {
  //       gameType,
  //       playerIds,
  //       gameRoomId,
  //       gameData: UwoGameService.getGame(gameRoomId)
  //     }
  //     client.socket.emit('start-game', data)
  //   } else if (gameType === 'who-is') {
  //     const game = this.whoIsGameList.get(gameRoomId)
  //     if (game) {
  //       const data: any = {
  //         gameType,
  //         playerIds,
  //         gameRoomId,
  //         questions: game.questions,
  //         round: game.round
  //       }
  //       this.emitRoomEvent(gameRoomId, 'start-game', data)
  //       roomInfo.offeredGames[gameRoomId].offeredCount = data.playerIds.length
  //     }
  //   } else if (gameType === 'doodly') {
  //     const game = this.doodlyGameList.get(gameRoomId)
  //     if (game) {
  //       const data: any = {
  //         gameType,
  //         playerIds,
  //         gameRoomId,
  //         words: game.words,
  //         points: game.points,
  //         round: game.round
  //       }
  //       const playerCnt = playerIds.length
  //       if (playerCnt < 7) {
  //         data.roundCnt = playerCnt * 3
  //       } else {
  //         data.roundCnt = Math.round(playerCnt * 2.5)
  //       }
  //       this.emitRoomEvent(gameRoomId, 'start-game', data)
  //       roomInfo.offeredGames[gameRoomId].offeredCount = data.playerIds.length
  //     }
  //   } else if (gameType === 'humanity') {
  //     // const gameData = againstHumanity.joinGame(gameRoomId, playerId)
  //     // if (gameData) {
  //     //   const data: any = {
  //     //     gameType,
  //     //     playerIds,
  //     //     gameRoomId,
  //     //     gameData,
  //     //   }
  //     //   this.emitRoomEvent(gameRoomId, 'start-game', data)
  //     roomInfo.offeredGames[gameRoomId].offeredCount = playerIds.length
  //     // }
  //   } else if (gameType === 'love-hate') {
  //     const game = this.loveHateGameList.get(gameRoomId)
  //     if (game) {
  //       const data = {
  //         gameType,
  //         playerIds,
  //         gameRoomId,
  //         round: game.round,
  //         questions: game.questions
  //       }
  //       this.emitRoomEvent(gameRoomId, 'start-game', data)
  //     }
  //   }

  //   return true
  // }

  // private leaveGameObserver(roomId: string, gameRoomId: string, gameType: string, playerId: string) {
  //   const roomInfo = this.roomList.get(roomId)
  //   if (!roomInfo || !gameRoomId) {
  //     return
  //   }

  //   const playerIds = roomInfo.offeredGames[gameRoomId]?.playerIds
  //   const client = this.clients.get(playerId)

  //   if (!client || !playerIds) {
  //     return
  //   }
  //   if (playerIds.includes(playerId)) {
  //     playerIds.splice(playerIds.indexOf(playerId), 1)
  //   }
  //   client.gameRoomId = undefined
  //   client.gameType = undefined
  //   if (roomInfo.playerInfoList[playerId]) {
  //     roomInfo.playerInfoList[playerId].gameState = ''
  //   }
  //   client.socket.leave(gameRoomId)

  //   if (gameType === 'humanity') {
  //     againstHumanity.leaveObserve(gameRoomId, playerId)
  //   }
  // }
}

export default new ListenerService()