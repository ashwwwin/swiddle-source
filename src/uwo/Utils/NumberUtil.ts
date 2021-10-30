class NumberUtil {
	getSanitizedValueWithBoundaries (value: number, max: number, min: number) {
		let sanitizedValue: number

		if (value >= max) {
			sanitizedValue = value % max
		} else if (value <= min) {
			sanitizedValue = Math.abs(max - Math.abs(value)) % max
		} else {
			return value
		}

		return sanitizedValue
	}

	getNextPlayerIndex (direction: string, currIndex: number, max: number, min: number) {
		if (direction === "clockwise") {
			let value:number = (currIndex >= max) ? 0 : currIndex + 1
			return value
		} else {
			let value:number = (currIndex <= 0) ? max : currIndex - 1
			return value
		} 
	}
}

export default new NumberUtil()
