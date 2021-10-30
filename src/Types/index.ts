import { Socket } from 'socket.io'

export type Player = {
  id: string
  peerId: string
  roomId: string
  name: string
  avatar?: string
  guest?: boolean
  posX: number
  posY: number
  lastMsg: string
  seatTableId?: string | ''
  seatPos?: number | null
  gameState: GameState
  enableAudio: boolean
  verified: boolean
  bio: string
  msgEmailNotify: boolean
  shareAccessCount: number
  accessSentCount: number
  dailyRewardLastClaimed: Date
  dailyRewardStreak: number
  dailyRewardTotal: number
  roomName: string
  timeZone: string
}

export type Game = {
  tableId: string
  gameType: string
  gameRoomId: string
  // creatorId: string
  // acceptedIds: string[]
  // rejectedIds: string[]
  // joinedPlayerIds: string[]
  // offeredCount: number
  playerIds: string[]
  countDown: number
  timer?: any
  gameState: "waiting" | "counting" | "playing"
}

export type AirHockeyTable = {
  tableId: string
  left: string
  right: string
  gameId: { type: string, default: "" }
}

export type RoomInfo = {
  ownerId: string
  seatStateList: { [index: string]: { [index: number]: string } }
  playerInfoList: { [index: string]: Player }
  offeredGames: { [index: string]: Game }
  requirePassword: boolean
  password: string
  guestCanPlayVideo?: boolean
  playingVideo?: boolean
  selectedVideo?: string
  furnitureList?: Object,
  inventories?: Object,
  airHekyTables?: { [index: string]: AirHockeyTable }
  roomName?: string
  roomDesc?: string
  roomImage?: string
  roomVerified?: boolean
  maxUsers?: number
  lockedRoom?: boolean
}

export type GameState = "" | "offer" | "accept" | "joined"

export type Client = {
  socket: Socket
  playerId?: string
  roomId?: string
  address: string
  gameRoomId?: string
  gameType?: string
  twilioToken?: string
  email?: string
}

export type WhoIsGame = {
  questions: any[]
  round: number
}

export type DoodlyGame = {
  words: string[]
  round: number
  roundCnt: number
  points: { [index: string]: number }
}

export type LoveHateGame = {
  questions: any[]
  round: number
  gameManager: string
}

export type GuessWhoGame = {
  statements: { [index: string]: string[] }
  choices: string[]
  round: number
  gameManager: string
  playerCnt: number
}

export type CodenameWord = {
  word: string
  type: "red" | "blue" | "netural" | "death"
  flipped: boolean
}

export type CodenameGame = {
  currentTeam: "red" | "blue"
  cardCnt: { [index: string]: number }
  score: { [index: string]: number }
  state: "start" | "end"
  words: CodenameWord[]
  team: { [index: string]: "red" | "blue" }
  spyMasters: { [index: string]: string }
}

export type Pos = {
  x: number,
  y: number,
}

export type SeatInfo = {
  seatWidth: number
  chairHeight: number
  deskHeight: number
  count: number
  firstPosX: number
  firstPosY: number
  // posList: Pos[]
}

export type shop = {
  packageName: string
  active: boolean
  coinsAmount: number
  priceUSD: number
}