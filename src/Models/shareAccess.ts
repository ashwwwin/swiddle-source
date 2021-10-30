import mongoose from 'mongoose'
const Schema = mongoose.Schema

const shareAccessSchema = new Schema({
  userId: String,
  email: String
}, { timestamps: true })

module.exports = mongoose.model('share_access', shareAccessSchema)