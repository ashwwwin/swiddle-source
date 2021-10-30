import mongoose from 'mongoose'
const Schema = mongoose.Schema

const doodlyGameDataSchema = new Schema({
  gameRoomId: String,
  roundNumber: Number,
  userId: String,
  word: String,
  guess: String,
  correct: Boolean,
  totalPlayers: Number,
}, { timestamps: true })

module.exports = mongoose.model('game_doodly_data', doodlyGameDataSchema)