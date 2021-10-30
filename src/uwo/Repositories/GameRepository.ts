import { Game } from "@uwo/protocols"

class GameRepository {
	private static games: Map<string, Game> = new Map()

	static setGameData (gameId: string, game: Game): void {
		this.games.set(gameId, game)
	}

	static getGame (gameId: string): Game {
		const game = this.games.get(gameId)

		// @ts-ignore
		return game
	}

	static getGameList (): Game[] {
		const games: Game[] = []

		for (const game of this.games.values()) {
			games.push(game)
		}

		return games
	}
}

export default GameRepository
