import CardService from "@uwo/Services/CardService"
import ListenerService from "@/Services/ListenerService"
import GameRoundService from "@uwo/Services/GameRoundService"

import NumberUtil from "@uwo/Utils/NumberUtil"
import ArrayUtil from "@uwo/Utils/ArrayUtil"

import environmentConfig from "@uwo/Config/environment"

import {
	Game,
	GameEvents,
	PlayerData,
	CurrentPlayerInfo,
	CurrentPlayerGameStatus,
	CardData,
	CardColors,
	PlayerStatus,
} from "@uwo/protocols"

import GameRepository from "@uwo/Repositories/GameRepository"

class GameService {

	setupGame (playerIds: string[], gameId: string) {
		const cards = CardService.setupRandomCards()
		const players: PlayerData[] = []

		playerIds.forEach((playerId, index) => {
			players.push({
				id: playerId,
				handCards: [],
				usedCards: [],
				status: "online",
				ready: true,
				isCurrentRoundPlayer: false,
				canBuyCard: false,
				uwoCall: false
			})
		})

		let game: Game = {
			maxPlayers: 6,
			type: "public",
			status: "waiting",
			round: 0,
			id: gameId,
			currentPlayerIndex: 0,
			nextPlayerIndex: 1,
			currentGameColor: null,
			availableCards: [],
			usedCards: [],
			players,
			cards,
			direction: "clockwise",
			currentCardCombo: {
				cardTypes: [],
				amountToBuy: 0,
			},
			maxRoundDurationInSeconds: environmentConfig.isDev ? 2 : 20,
			createdAt: Date.now(),
			ranks: []
		}

		this.setGameData(gameId, game)
		this.startGame(gameId)
		return game
	}

	turnTimer(gameId: string) {
		let game = this.getGame(gameId)

		if (this.checkGameEnd(gameId))
			return
		
		if (game.players[game.currentPlayerIndex].status !== "offline") {
			let usableCards = game?.players[game.currentPlayerIndex]?.handCards.filter(card => {
				return card.canBeUsed == true
			})
	
			if (usableCards.length > 0) {
				let ranIndex:number = Math.floor(Math.random()*usableCards.length),
					autoCard = usableCards[ranIndex],
					defaultColor:CardColors
	
				defaultColor = !game.currentGameColor ? (autoCard.color == 'black') ? "red" : '' : ''
				game.currentGameColor = game.currentGameColor ? game.currentGameColor : (autoCard.color == "black" ) ? "red" : autoCard.color
				this.putCard((game?.players[game.currentPlayerIndex]?.id || ''), [usableCards[ranIndex].id], (gameId || ''), defaultColor, true)
				return
			}
		}

		this.checkHavingUseableCards(gameId)
	}

	checkHavingUseableCards(gameId: string) {
		let game = this.getGame(gameId)

		this.updateCurrentIndex(gameId)

		if (this.checkGameEnd(gameId))
			return 

		if (game.players[game.currentPlayerIndex].status === "offline")
			this.updateCurrentIndex(gameId)

		while((game?.players[game.currentPlayerIndex].canBuyCard)) {

			if (game.players[game.currentPlayerIndex].status !== "offline")
				this.addNewCard(game.players[game.currentPlayerIndex].id, gameId)

			if (!game?.players[game.currentPlayerIndex].canBuyCard)
				break
			
			this.updateCurrentIndex(gameId)
			game.players = this.buildPlayersWithCardUsability(game.players[game.currentPlayerIndex].id, gameId)
		} 

		game.players = this.buildPlayersWithCardUsability(game.players[game.currentPlayerIndex].id, gameId)
		this.setGameData(gameId, game)
		this.resetRoundCounter(gameId)
	}

	uwoCallCheck (playerId: string, gameId: string) {
		let game = this.getGame(gameId)
		
		if (game.players[game.currentPlayerIndex].handCards.length > 1)
			return

		const curPlayerId = game.players[game.currentPlayerIndex].id
		let available = [...game?.availableCards]

		game.players = game?.players?.map(player => {
			if (player.id === curPlayerId && player.handCards.length === 1) {
				const cards = available.slice(0, 2)
				available = available.slice(2, available.length)
				game.availableCards = available
				return {
					...player,
					handCards: [...cards, ...player?.handCards],
				}
			} else {
				return player
			}
		})
		
		this.checkHavingUseableCards(gameId)
		this.resetRoundCounter(gameId)
	}

	putCard (playerId: string, cardIds: string[], gameId: string, selectedColor: CardColors, autoFlag: boolean) {
		const currentPlayerInfo = this.getCurrentPlayerInfo(gameId)
		if (currentPlayerInfo.id !== playerId)
			return

		let game = this.getGame(gameId)

		const player = game?.players?.find(player => player.id === playerId),
			cards: CardData[] = []

		cardIds.forEach(cardId => {
			const card = player?.handCards?.find(card => card.id === cardId)
			if (card) {
				cards.push(card)
			}
		})

		game.players = game?.players?.map(player => {
			if (player.id === playerId) {
				return {
					...player,
					handCards: player?.handCards?.filter(card => !cardIds.includes(card.id)),
					usedCards: [...cards, ...player?.usedCards],
				}
			} else {
				return player
			}
		})

		/**
		 * We keep flowing the used cards back to stack, in order to help
		 * keeping the game up till someone wins it.
		 */
		const usedCards = [...cards, ...game?.usedCards]
		const inStackCards = usedCards.slice(0, 10)
		let outStackCards = usedCards.slice(10, usedCards.length)

		outStackCards = outStackCards.map(card => {
			if (card.color === "black") {
				return {
					...card,
					selectedColor: undefined,
					src: card.possibleColors?.black,
				}
			} else {
				return card
			}
		})

		ArrayUtil.shuffle(outStackCards)

		game.usedCards = inStackCards
		game.availableCards = [
			...game.availableCards,
			...outStackCards,
		]

		game.currentGameColor = cards[0]?.color
		game = this.buildGameWithCardEffect(gameId, cards, selectedColor)
		this.setGameData(gameId, game)
		this.nextRound(gameId, autoFlag)
	}

	changePlayerStatus (gameId: string, playerId: string, playerStatus: PlayerStatus) {
		const game = this.getGame(gameId)
		game.players = this.buildPlayersWithChangedPlayerStatus(gameId, playerId, playerStatus)
		this.setGameData(gameId, game)
	}

	gameExists (gameId: string) {
		const game = GameRepository.getGame(gameId)

		if (game)
			return true
		else 
			return false
	}

	joinGame (gameId: string, playerId: string) {
		const game = this.getGame(gameId),
			player = game?.players?.find(player => player.id === playerId),
			gameIsNotFull = game.players.length < game.maxPlayers,
			playerIsNotOnGame = !player

		if (gameIsNotFull && playerIsNotOnGame) 
			this.addPlayer(gameId, playerId)

		if (!playerIsNotOnGame) {
			game.players = this.buildPlayersWithChangedPlayerStatus(gameId, playerId, "online")
		}
	}

	purgePlayer (gameId: string, playerId: string) {
		const games = this.getGameList()
		this.disconnectPlayer(gameId, playerId)
	}

	toggleReady (playerId: string, gameId: string) {
		const game = this.getGame(gameId)

		game.players = game?.players?.map(player => {
			if (player.id === playerId) {
				return {
					...player,
					ready: !player.ready,
				}
			} else {
				return player
			}
		})

		const areAllPlayersReady = game?.players?.every(player => player.ready)
		const isThereMoreThanOnePlayer = game?.players?.length > 1

		if (areAllPlayersReady && isThereMoreThanOnePlayer) {

			this.setGameData(gameId, game)
			this.startGame(gameId)
		}
	}

	getGameList () : Game[] {
		return GameRepository.getGameList()
	}

	private addNewCard (playerId: string, gameId: string) {
		const currentPlayerInfo = this.getCurrentPlayerInfo(gameId)
		if (currentPlayerInfo.id !== playerId) 
			return false
		
		let game = this.getGame(gameId),
			player = game?.players?.find(player => player.id === currentPlayerInfo.id),
			needToBuyCard = player?.handCards?.every(card => !card.canBeUsed)

		if (!needToBuyCard)
			return false

		const available = [...game?.availableCards]
		let card = available.shift()

		game.players = game?.players?.map(player => {
			if (player.id === playerId && card) {
				return {
					...player,
					handCards: [...player.handCards, card],
				}
			} else {
				return player
			}
		})
		game.availableCards = available
		game.players = this.buildPlayersWithCardUsability(currentPlayerInfo.id, gameId)
		return true
	}

	private buildGameWithCardEffect (gameId: string, cards: CardData[], selectedColor: CardColors): Game {

		const game = this.getGame(gameId),
			cardTypes = cards.map(card => card.type),
			cardIds = cards.map(card => card.id)

		const isBuy4Card = cardTypes.every(cardType => cardType === "buy-4"),
			isBuy2Card = cardTypes.every(cardType => cardType === "buy-2"),
			isChangeColorCard = cardTypes.every(cardType => cardType === "change-color"),
			isReverseCard = cardTypes.every(cardType => cardType === "reverse"),
			isBlockCard = cardTypes.every(cardType => cardType === "block")

		if (isChangeColorCard || isBuy4Card) {

			if (game.currentGameColor == 'black' && !selectedColor) {
				game.currentGameColor = 'red'
				selectedColor = 'red'
			}
			else 
				game.currentGameColor = selectedColor
			game.usedCards = game.usedCards.map(card => {
				if (cardIds.includes(card.id)) {
					return {
						...card,
						color: selectedColor,
						src: card.possibleColors?card.possibleColors[selectedColor]:undefined,
					}
				} else {
					return card
				}
			})
		}

		if (isReverseCard) {
			if (game.direction === "clockwise") 
				game.direction = "counterclockwise"
			else 
				game.direction = "clockwise"
		}

		if (isBlockCard) {
			cardTypes.forEach(() => {
				this.updateCurrentIndex(gameId)
			})
		}

		if (isBuy2Card || isBuy4Card) {

			let amountToBuy = 0	
			cardTypes.forEach(cardType => {
				if (cardType === "buy-2")
					amountToBuy += 2
				else if (cardType === "buy-4")
					amountToBuy += 4
			})

			let available = [...game?.availableCards]
			const cards = available.slice(0, amountToBuy)
			available = available.slice(amountToBuy, available.length)

			game.players = game?.players?.map(player => {
				if (player.id === game?.players?.[game.nextPlayerIndex].id) {
					return {
						...player,
						handCards: [...cards, ...player?.handCards],
					}
				} else {
					return player
				}
			})

			game.availableCards = available
			this.updateCurrentIndex(gameId)
		}

		game.players = this.buildPlayersWithCardUsability(game.players[game.currentPlayerIndex].id, gameId)
		return game
	}

	private buildPlayersWithCardUsability (currentPlayerId: string, gameId: string): PlayerData[] {
		const game = this.getGame(gameId),
			topStackCard = this.getTopStackCard(gameId),
			playersWithCardUsability = game?.players?.map(player => {
				const handCards = player?.handCards?.map(handCard => ({
				...handCard,
				canBeUsed: (
					topStackCard?.color === handCard?.color ||
					handCard?.type === "change-color" ||
					handCard?.type === "buy-4" ||
					topStackCard?.type === handCard?.type ||
					handCard?.color === game.currentGameColor ||
					!game.currentGameColor
				),
				canBeCombed: game.currentCardCombo.cardTypes.includes(handCard?.type),
			}))

			return {
				...player,
				isCurrentRoundPlayer: currentPlayerId === player.id,
				canBuyCard: player.status == "online" && handCards.every(card => !card.canBeUsed),
				handCards,
			}
		})

		return playersWithCardUsability
	}

	private resetRoundCounter (gameId: string) {
		const game = this.getGame(gameId)

		GameRoundService.resetRoundCounter(gameId, {
			timeoutAction: (gameId) => {
				this.turnTimer(gameId)
				this.resetRoundCounter(gameId);
			},
			// intervalAction: (gameId) => {
			// 	// const gameRoundRemainingTime = this.getRoundRemainingTimeInSeconds(gameId)
			// 	// GameRoundService.emitGameRoundEvent(gameId, "GameRoundRemainingTimeChanged", gameRoundRemainingTime)
			// 	return;
			// },
			gameId,
			timeInSeconds: game.maxRoundDurationInSeconds,
		})
	}

	private nextRound (gameId: string, autoFlag:boolean) {

		const currentPlayerInfo = this.getCurrentPlayerInfo(gameId)
		let game = this.getGame(gameId)

		if (currentPlayerInfo.gameStatus === "winner" && !game.ranks.includes(game?.players[game.currentPlayerIndex].id)) {
			game.ranks.push(game?.players[game.currentPlayerIndex].id)
			this.emitGameEvent(gameId, "PlayerWon", game.ranks)
			this.endGame(gameId)
		}

		game.round++
		game.players = this.buildPlayersWithCardUsability(game.players[game.currentPlayerIndex].id, gameId)
		this.checkHavingUseableCards(gameId)
	}

	endGame (gameId: string) {
		const winnerInfo = this.getCurrentPlayerInfo(gameId)
		let game = this.getGame(gameId)
		const cards = CardService.setupRandomCards()

		game.status = "ended"
		game.round = 0
		const winnerIndex = game.players.findIndex(player => player.id === winnerInfo.id)

		game = {
			...game,
			status: "ended",
			round : 0,
			currentPlayerIndex: winnerIndex,
			nextPlayerIndex: NumberUtil.getSanitizedValueWithBoundaries(game?.currentPlayerIndex + 1, game?.players?.length, 0),
			availableCards: [],
			usedCards: [],
			currentCardCombo: {
				cardTypes: [],
				amountToBuy: 0
			},
			cards: cards,
			players: game?.players?.map(player=> ({
				...player,
				canBuyCard: false,
				handCards: [],
				isCurrentRoundPlayer: false,
				ready: false,
				status: "online",
				usedCards: [],
			}))
		}

		this.setGameData(gameId, game)
		this.removeRoundCounter(gameId)
		this.emitGameEvent(gameId, "GameEnded")
	}

	private startGame (gameId: string) {
		const game = this.getGame(gameId),
			allCards = [...game?.cards],
			currentPlayer = game?.players?.[game.currentPlayerIndex]

		game.status = "playing"
		game.players = game?.players.map(player => {
			const handCards: CardData[] = []

			for (let i = 0; i < 7; i++) {
				const selectedCard = allCards.shift()
				if (selectedCard) {
					handCards.push(selectedCard)
				}
			}

			return {
				...player,
				isCurrentRoundPlayer: player.id === currentPlayer.id,
				handCards: handCards.map(handCard => ({
					...handCard,
					canBeUsed: player.id === currentPlayer.id,
				})),
				canBuyCard: false,
			}
		})

		game.availableCards = allCards

		this.setGameData(gameId, game)
		this.emitGameEvent(gameId, "GameStarted", game)
		this.resetRoundCounter(gameId)
	}

	private makeComputedPlay (gameId: string, playerId: string): void {
		const game = this.getGame(gameId)
		const player = game.players.find(playerItem => playerItem.id === playerId)
		if (player?.status === "online") {
			return
		}
		if (player) {
			const { handCards } = player
			const usableCard = handCards.find(card => card.canBeUsed)

			if (!usableCard) {
				this.addNewCard(playerId, gameId)
				return this.makeComputedPlay(gameId, playerId)
			}

			const randomCardColor = CardService.retrieveRandomCardColor()
			this.putCard(playerId, [usableCard.id], gameId, randomCardColor, true)
		}
	}

	private removeRoundCounter (gameId: string) {
		GameRoundService.removeRoundCounter(gameId)
	}

	private buildPlayersWithChangedPlayerStatus (gameId: string, playerId: string, status: PlayerStatus): PlayerData[] {
		const game = this.getGame(gameId)

		const playersWithChangedPlayerStatus = game.players.map(player => {
			if (player.id === playerId) {
				return {
					...player,
					status,
				}
			}

			return player
		})

		return playersWithChangedPlayerStatus
	}

	private getCurrentPlayerInfo (gameId: string): CurrentPlayerInfo {
		const game = this.getGame(gameId),
			{ players } = game,
			currentPlayer = players[game?.currentPlayerIndex],
			currentPlayerId = currentPlayer?.id
			
		let gameStatus: CurrentPlayerGameStatus = ''

		if (currentPlayer?.handCards.length === 0) {
			gameStatus = "winner"
		} else if (currentPlayer?.handCards.length === 1) {
			gameStatus = "uno"
		}

		return {
			id: currentPlayerId,
			playerStatus: currentPlayer.status,
			gameStatus,
		}
	}

	private emitGameEvent (gameId: string, event: GameEvents, ...data: unknown[]) {
		ListenerService.emitRoomEvent(gameId, event, ...data)
	}

	private setGameData (gameId: string, game: Game) {
		if (game.status == "playing") {
			game.players = this.buildPlayersWithCardUsability(game.players[game.currentPlayerIndex].id, gameId)
			this.emitGameEvent(gameId, "GameStateChanged", game)
		}
		GameRepository.setGameData(gameId, game)
	}

	private getTopStackCard (gameId: string) {
		const game = this.getGame(gameId)
		return game?.usedCards?.[0]
	}

	private addPlayer (gameId: string, playerId: string) {
		const game = this.getGame(gameId)
		let available = [...game?.availableCards]
		const cards = available.slice(0, 7)
		available = available.slice(7, available.length)
		game.availableCards = available

		game.players = [
			...game?.players,
			{
				id: playerId,
				handCards: cards,
				usedCards: [],
				status: "online",
				ready: true,
				isCurrentRoundPlayer: false,
				canBuyCard: false,
				uwoCall: false
			},
		]
		this.setGameData(gameId, game)
	}

	private disconnectPlayer (gameId: string, playerId: string) {
		const game = this.getGame(gameId)

		if (game.status === "waiting") {
			game.players = game?.players?.filter(player => player.id !== playerId)
		}

		if (game.status === "playing") {
			if (game.players[game.currentPlayerIndex].id == playerId)
				this.checkHavingUseableCards(gameId)
		
			game.players = this.buildPlayersWithChangedPlayerStatus(gameId, playerId, "offline")
		}

		this.setGameData(gameId, game)
	}

	getGame (gameId: string) : Game {
		const game = GameRepository.getGame(gameId)

		return game
	}

	private checkGameEnd(gameId: string) {
		let game = this.getGame(gameId)

		if (game.ranks.length > 0 || game.status === "ended")
			return true

		const winners = game.players.filter(player=>{ return player.handCards.length == 0 })
		if (winners.length > 0) {
			// winners.forEach(player=>{
			// 	if (!game.ranks.includes(player.id))
			// 		game.ranks.push(player.id)
			// })
			this.emitGameEvent(gameId, "PlayerWon", game.ranks)
			this.endGame(gameId)
			return true
		}
		return false
	}

	private updateCurrentIndex(gameId: string) {
		let game = this.getGame(gameId)
		game.currentPlayerIndex = NumberUtil.getNextPlayerIndex(game.direction, game.currentPlayerIndex, game.players.length - 1, 0)

		while(game.players[game.currentPlayerIndex].status === "offline") {
			game.currentPlayerIndex = NumberUtil.getNextPlayerIndex(game.direction, game.currentPlayerIndex, game.players.length - 1, 0)		
		}

		game.nextPlayerIndex = NumberUtil.getNextPlayerIndex(game.direction, game.currentPlayerIndex, game.players.length - 1, 0)

		while(game.players[game.nextPlayerIndex].status === "offline") {
			game.nextPlayerIndex = NumberUtil.getNextPlayerIndex(game.direction, game.nextPlayerIndex, game.players.length - 1, 0)
		}
	}
}

export default new GameService()
