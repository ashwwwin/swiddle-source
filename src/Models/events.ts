import mongoose from 'mongoose'
const Schema = mongoose.Schema

const eventSchema = new Schema({
    eventName: String,
    invites: Array, 
    eventTime: Date,
    eventTimeTZ: String,
    eventCreator: { type: Schema.Types.ObjectId, ref: 'users', require: true },
    canceled:  { type: Boolean, default: false },
    participantsNotified: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('events', eventSchema)
