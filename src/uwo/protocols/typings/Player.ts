import { CardData } from "./Card"

export type Player = {
	id: string
}

export type PlayerState =
"Uno" |
"Blocked" |
"BuyCards"

export type PlayerStatus = "online" | "offline" | "afk"

export type PlayerData = Player & {
	handCards: CardData[]
	usedCards: CardData[]
	status: PlayerStatus
	ready: boolean
	isCurrentRoundPlayer: boolean
	canBuyCard: boolean
	uwoCall: boolean
}

export type CurrentPlayerGameStatus = "uno" | "winner" | "afk" | ""

export type CurrentPlayerInfo = {
	id: string
	gameStatus: CurrentPlayerGameStatus
	playerStatus: PlayerStatus
}
