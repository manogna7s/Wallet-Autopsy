import mongoose from 'mongoose'
import { env } from '../config/env.js'

let lastError = null

export async function connectMongo() {
  const uri = env.mongoUri
  if (!uri) {
    lastError = 'not_configured'
    console.log('MongoDB not configured. Using in-memory session store.')
    return false
  }
  try {
    mongoose.set('strictQuery', true)
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    lastError = null
    console.log('MongoDB connected')
    return true
  } catch (error) {
    lastError = 'unavailable'
    const detail = String(error.message || 'unavailable').replace(/mongodb(\+srv)?:\/\/[^@]+@/i, 'mongodb://***@')
    console.error('MongoDB unavailable. Using in-memory session store.')
    console.error(detail)
    return false
  }
}

export function isMongoReady() {
  return mongoose.connection.readyState === 1
}

export function mongoStatus() {
  return {
    configured: Boolean(env.mongoUri),
    connected: isMongoReady(),
    reason: isMongoReady() ? null : lastError || (env.mongoUri ? 'disconnected' : 'not_configured'),
  }
}
