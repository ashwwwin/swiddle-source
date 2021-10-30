import ListenerService from "@/Services/ListenerService"

import {
	GameRoundEvents,
	GameRoundCounter,
} from "@uwo/protocols"

import GameRoundRepository from "@uwo/Repositories/GameRoundRepository"

class GameRoundService {
	getRoundRemainingTimeInSeconds (gameId: string) {
		const gameRoundCounter = GameRoundRepository.getGameRoundCounter(gameId)

		if (gameRoundCounter) {
			const { initializedAtMilliseconds, timeInSeconds } = gameRoundCounter

			const currentTimeInMilliseconds = Date.now()

			const passedTimeInSeconds = ((currentTimeInMilliseconds - (initializedAtMilliseconds || 0)) / 1000)

			if (passedTimeInSeconds > timeInSeconds) {
				return timeInSeconds
			}

			const remainingTimeInSeconds = Math.round(timeInSeconds - passedTimeInSeconds)

			return remainingTimeInSeconds
		}

		return null
	}

	resetRoundCounter (gameId: string, roundCounter: GameRoundCounter) {
		const currentRoundCounter = GameRoundRepository.getGameRoundCounter(gameId)

		if (currentRoundCounter) {
			const oldTimeoutId = currentRoundCounter.timeoutId
			// const oldIntervalId = currentRoundCounter.intervalId

			if (oldTimeoutId) {
				clearTimeout(oldTimeoutId)
			}
			// if (oldIntervalId) {
			// 	clearInterval(oldIntervalId)
			// }
		}

		const roundCounterInMilliseconds = roundCounter.timeInSeconds * 1000

		const newTimeoutId = setTimeout(() => {
			roundCounter.timeoutAction(gameId)
		}, roundCounterInMilliseconds)

		// const newIntervalId = setInterval(() => {
		// 	roundCounter.intervalAction(gameId)
		// }, 1000)

		GameRoundRepository.setGameRoundCounterData(gameId, {
			...roundCounter,
			timeoutId: newTimeoutId,
			// intervalId: newIntervalId,
			initializedAtMilliseconds: Date.now(),
		})
	}

	removeRoundCounter (gameId: string) {
		const currentRoundCounter = GameRoundRepository.getGameRoundCounter(gameId)

		if (currentRoundCounter) {
			const oldTimeoutId = currentRoundCounter.timeoutId
			const oldIntervalId = currentRoundCounter.intervalId

			if (oldTimeoutId) {
				clearTimeout(oldTimeoutId)
			}
			if (oldIntervalId) {
				clearInterval(oldIntervalId)
			}

			GameRoundRepository.deleteGameRoundCounter(gameId)
		}
	}

	emitGameRoundEvent (gameId: string, event: GameRoundEvents, ...data: unknown[]) {
		ListenerService.emitRoomEvent(gameId, event, ...data)
	}
}

export default new GameRoundService()
