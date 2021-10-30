import mongoose from 'mongoose'
const Schema = mongoose.Schema

const dailyGiftsSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'users', require: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'users', require: true },
  send_date: { type: Date, require: true },
  receive_date: Date,
  exists: Boolean,
}, { timestamps: true })

module.exports = mongoose.model('daily_gifts_data', dailyGiftsSchema)