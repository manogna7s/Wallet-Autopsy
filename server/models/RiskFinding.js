import mongoose from 'mongoose'

const riskFindingSchema = new mongoose.Schema(
  {
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investigation',
      required: true,
      index: true,
    },
    type: { type: String, required: true },
    severity: String,
    confidence: Number,
    explanation: String,
    evidence: mongoose.Schema.Types.Mixed,
    transactionHashes: [String],
    relatedAddresses: [String],
    title: String,
    signalId: String,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const RiskFinding = mongoose.models.RiskFinding || mongoose.model('RiskFinding', riskFindingSchema)
