import { Player } from "@uwo/protocols"

import PlayerRepository from "@uwo/Repositories/PlayerRepository"

class PlayerService {
	setPlayerData (playerData: Player) {
		PlayerRepository.setPlayerData(playerData)
	}

	playerExists (playerId: string) {
		const player = PlayerRepository.getPlayerData(playerId)

		if (player) {
			return true
		} else {
			return false
		}
	}
}

export default new PlayerService()
