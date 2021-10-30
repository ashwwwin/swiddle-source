import mongoose from 'mongoose'
const Schema = mongoose.Schema

const gameRoomSchema = new Schema({
  gameRoomId: String,
  gameName: String,
  userId: String,
  players: Number,
  totalPeopleInTable: Number,
  homeOwnerId: String,
  homeOwner: Boolean,
}, { timestamps: true })

module.exports = mongoose.model('game_rooms_data', gameRoomSchema)