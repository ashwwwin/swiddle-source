import { CardData, CardColors, CurrentCardCombo } from "./Card"
import { PlayerData } from "./Player"

export type GameEvents =
"GameStateChanged" |
"GameStarted" |
"GameCreated" |
"GameEnded" |
"PlayerWon" |
"PlayerUno" |
"PlayerJoined" |
"PlayerLeft" |
"SkipTurn"|
"PlayerBlocked" |
"PlayerBuyCards" |
"CardStackBuyCardsCombo" |
"GameRoundRemainingTimeChanged" |
"PlayerGotAwayFromKeyboard"

export type GameStatus =
"waiting" |
"playing" |
"ended"

export type GameType =
"private" |
"public"

export type GameDirection =
"clockwise" |
"counterclockwise"

export type Game = {
	direction: GameDirection
	type: GameType
	maxPlayers: number
	status: GameStatus
	round: number
	id: string
	currentPlayerIndex: number
	nextPlayerIndex: number
	currentGameColor: CardColors | null
	availableCards: CardData[]
	usedCards: CardData[]
	cards: CardData[]
	players: PlayerData[]
	currentCardCombo: CurrentCardCombo
	maxRoundDurationInSeconds: number
	createdAt: number,
	ranks: string[]
}
