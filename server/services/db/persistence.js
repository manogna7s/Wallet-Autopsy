import { isMongoReady, mongoStatus } from '../../db/connection.js'
import { createMemoryStore } from './memoryStore.js'
import { mongoStore } from './mongoStore.js'

const memory = createMemoryStore()
let forced = null

export function useMemoryStore() {
  forced = 'memory'
  memory.reset()
  return memory
}

export function useMongoStore() {
  forced = 'mongo'
}

export function resetStoreMode() {
  forced = null
}

export function storageKind() {
  if (forced === 'memory') return 'memory'
  if (forced === 'mongo' || isMongoReady()) return 'mongo'
  return 'memory'
}

function store() {
  if (forced === 'memory') return memory
  if (forced === 'mongo') return mongoStore
  return isMongoReady() ? mongoStore : memory
}

export async function persistCompletedInvestigation(sessionId, payload) {
  if (!sessionId) return null
  try {
    return await store().saveInvestigation(sessionId, payload)
  } catch (error) {
    console.error('Failed to persist investigation')
    return null
  }
}

export async function listHistory(sessionId) {
  try {
    return await store().listInvestigations(sessionId)
  } catch {
    return []
  }
}

export async function getHistoryById(sessionId, id) {
  try {
    return await store().getInvestigation(sessionId, id)
  } catch {
    return null
  }
}

export async function addWatchItem(sessionId, entry) {
  return store().addWatch(sessionId, entry)
}

export async function removeWatchItem(sessionId, id) {
  return store().removeWatch(sessionId, id)
}

export async function listWatchItems(sessionId) {
  try {
    return await store().listWatch(sessionId)
  } catch {
    return []
  }
}

export function persistenceStatus() {
  const mongo = mongoStatus()
  return {
    ...mongo,
    storage: storageKind(),
  }
}
