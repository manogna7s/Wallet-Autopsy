import mongoose from 'mongoose'

const investigationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    address: { type: String, required: true, index: true },
    chain: { type: String, required: true },
    chainLabel: String,
    investigatedAt: { type: Date, default: Date.now, index: true },
    riskScore: { type: Number, default: 0 },
    severity: String,
    confidence: mongoose.Schema.Types.Mixed,
    signalCount: { type: Number, default: 0 },
    summary: String,
    notices: [String],
    truncated: Boolean,
    empty: Boolean,
    activity: mongoose.Schema.Types.Mixed,
    risk: mongoose.Schema.Types.Mixed,
    provider: String,
  },
  { timestamps: true },
)

investigationSchema.index({ sessionId: 1, investigatedAt: -1 })

export const Investigation = mongoose.models.Investigation || mongoose.model('Investigation', investigationSchema)
