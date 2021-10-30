import { v4 as uuidv4 } from 'uuid'

class CryptUtil {
	makeShortUUID () {
		const uuidResult = uuidv4()

		const shortVersion = uuidResult.split("-").pop()

		return shortVersion
	}

	makeUUID () {
		const uuidResult = uuidv4()

		return uuidResult
	}
}

export default new CryptUtil()
