import mongoose from 'mongoose'
const Schema = mongoose.Schema

const pbnjGameDataSchema = new Schema({
  gameRoomId: String,
  roundNumber: Number,
  userId: String,
  blackCard: String,
  answer: String,
  winner: Boolean,
  totalPlayers: Number,
}, { timestamps: true })

module.exports = mongoose.model('game_pbnj_data', pbnjGameDataSchema)