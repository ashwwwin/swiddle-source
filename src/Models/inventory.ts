import mongoose from 'mongoose'
const Schema = mongoose.Schema

const inventorySchema = new Schema({
  categoryName: String,
  imageUrl: String,
  name: String,
  title: String,
  description: String,
  cost: Number
})

module.exports = mongoose.model('inventories', inventorySchema)