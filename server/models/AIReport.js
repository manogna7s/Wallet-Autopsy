import mongoose from 'mongoose'

const aiReportSchema = new mongoose.Schema(
  {
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investigation',
      required: true,
      unique: true,
    },
    summary: String,
    findings: [String],
    evidenceExplanation: [String],
    potentialExposure: [String],
    whatToCheck: [String],
    uncertainty: String,
    whyItMatters: [String],
    source: String,
    fallbackReason: String,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const AIReport = mongoose.models.AIReport || mongoose.model('AIReport', aiReportSchema)
