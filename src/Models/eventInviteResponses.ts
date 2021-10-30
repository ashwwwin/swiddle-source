import mongoose from 'mongoose'
const Schema = mongoose.Schema

const eventSchema = new Schema({
    eventId: { type: Schema.Types.ObjectId, ref: 'events', require: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', require: true },
    coming: Boolean,
    token: String,
}, { timestamps: true })

module.exports = mongoose.model('eventInviteResponses', eventSchema)
