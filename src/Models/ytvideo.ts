import mongoose from 'mongoose'
const Schema = mongoose.Schema

const videoSchema = new Schema({
  yid: String,
  title: String,
	donwload: {type: Boolean, default: false}
}, { timestamps: true })

module.exports = mongoose.model('yt_video', videoSchema)