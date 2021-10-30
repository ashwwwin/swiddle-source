import mongoose from 'mongoose'
const Schema = mongoose.Schema

const SignInLogSchema = new Schema({
  userId: String,
  date: Date,
})

module.exports = mongoose.model('log_signin', SignInLogSchema)