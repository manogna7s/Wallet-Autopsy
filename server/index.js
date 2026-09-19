import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import api from './routes/index.js'
import { errorHandler, notFound } from './utils/http.js'
import { sessionMiddleware } from './db/session.js'
import { connectMongo } from './db/connection.js'

export function createApp() {
  const app = express()
  app.use(cors({ origin: env.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(sessionMiddleware)
  app.use('/api', api)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export async function startServer() {
  await connectMongo()
  const app = createApp()
  const server = app.listen(env.port, () => {
    console.log(`Wallet Autopsy API on http://localhost:${env.port}`)
    console.log(`Alchemy configured: ${Boolean(env.alchemyKey)}`)
    console.log(`Gemini configured: ${Boolean(env.geminiKey)}`)
    console.log(`MongoDB configured: ${Boolean(env.mongoUri)}`)
    console.log(`Gemini model: ${env.geminiModel}`)
  })
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${env.port} is already in use` : error)
    process.exit(1)
  })
  return server
}


const isMain = process.argv[1] && process.argv[1].replaceAll('\\', '/').endsWith('/index.js')
if (isMain) {
  startServer()
}
