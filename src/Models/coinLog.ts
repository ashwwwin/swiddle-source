import mongoose from 'mongoose'
const Schema = mongoose.Schema

const coinLogSchema = new Schema({
  userId: String,
  gameRoomId: String,
  gameType: String,
  coins: Number,
}, { timestamps: true })

module.exports = mongoose.model('coin_logs', coinLogSchema)