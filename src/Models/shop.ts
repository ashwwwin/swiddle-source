import mongoose from 'mongoose'
const Schema = mongoose.Schema

const shopSchema = new Schema({
  packageKey: String,
  packageName: String,  
  active: Boolean,
  coinsAmount: Number,
  priceUSD: Number
}, { timestamps: true })

module.exports = mongoose.model('shop', shopSchema)