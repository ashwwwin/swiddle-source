import mongoose from 'mongoose'
const Schema = mongoose.Schema

const whoIsGameDataSchema = new Schema({
  gameRoomId: String,
  roundNumber: Number,
  userId: String,
  question: String,
  numOfVotes: Number,
  winner: Boolean,
  totalPlayers: Number,
}, { timestamps: true })

module.exports = mongoose.model('game_whois_data', whoIsGameDataSchema)