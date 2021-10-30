import mongoose from 'mongoose'
const Schema = mongoose.Schema

const siteConfigSchema = new Schema({
  restrict: { type: Boolean, default: true }
})

module.exports = mongoose.model('site_configs', siteConfigSchema)