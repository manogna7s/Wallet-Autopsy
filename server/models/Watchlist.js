import mongoose from 'mongoose'

const watchlistSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    address: { type: String, required: true },
    chain: { type: String, required: true, default: 'ethereum' },
    label: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

watchlistSchema.index({ sessionId: 1, address: 1, chain: 1 }, { unique: true })

export const Watchlist = mongoose.models.Watchlist || mongoose.model('Watchlist', watchlistSchema)
