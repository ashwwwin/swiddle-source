import mongoose from 'mongoose'
const Schema = mongoose.Schema

const friendChatSchema = new Schema({
  sender: String,
  receiver: String,
  msg: String,
  viewed: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('friend_chats', friendChatSchema)