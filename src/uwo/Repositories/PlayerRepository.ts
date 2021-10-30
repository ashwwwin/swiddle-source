import { Player } from "@uwo/protocols"

class PlayerRepository {
	private static players: Map<string, Player> = new Map()

	static setPlayerData (playerData: Player): void {
		this.players.set(playerData.id, playerData)
	}

	static getPlayerData (playerId: string): Player | undefined {
		return this.players.get(playerId || '')
	}
}

export default PlayerRepository
