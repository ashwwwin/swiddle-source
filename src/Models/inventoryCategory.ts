import mongoose from 'mongoose'
const Schema = mongoose.Schema

const inventoryCategorySchema = new Schema({
  name: {type: String, unique: true},
  iconUrl: String,
  order: Number
}, { timestamps: true })

module.exports = mongoose.model('inventory_categories', inventoryCategorySchema)