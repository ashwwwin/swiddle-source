import mongoose from 'mongoose'
const Schema = mongoose.Schema

const friendSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'users', require: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'users', require: true },
  send_date: Date,
  receive_date: Date,
  openConvo: { type: Boolean, default: false },
})
friendSchema.index({
  sender: 1,
  receiver: 1,
}, {
  unique: true,
})

module.exports = mongoose.model('friends', friendSchema)