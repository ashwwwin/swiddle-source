import mongoose from 'mongoose'
const Schema = mongoose.Schema

const feedbackSchema = new Schema({
  userId: String,
  feedback: String,
  date: Date,
  status: { type: Number, default: 0 },
  responded: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('feedbacks', feedbackSchema)