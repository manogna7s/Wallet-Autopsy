import mongoose from 'mongoose'

const transactionSnapshotSchema = new mongoose.Schema(
  {
    investigationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investigation',
      required: true,
      index: true,
    },
    hash: String,
    from: String,
    to: String,
    value: mongoose.Schema.Types.Mixed,
    token: String,
    tokenAddress: String,
    transactionType: String,
    timestamp: String,
    spender: String,
    unlimited: Boolean,
    status: String,
    uniqueId: String,
    method: String,
    contractInteraction: Boolean,
    direction: String,
    blockNum: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
)

export const TransactionSnapshot =
  mongoose.models.TransactionSnapshot || mongoose.model('TransactionSnapshot', transactionSnapshotSchema)
