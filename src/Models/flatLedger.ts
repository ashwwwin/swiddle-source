import mongoose from 'mongoose'
const Schema = mongoose.Schema

const flatSchema = new Schema({
  // flatType:  { type: Schema.Types.ObjectId, ref: 'flatTypes', require: true },
  tokenId: {type: Number, require: true, unique: true},
  flatOwner: {type: String, require: true},
})

module.exports = mongoose.model('flatLedger', flatSchema)