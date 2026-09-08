const fs = require('fs').promises
const path = require('path')
const config = require('./config/config')

const OBJECT_NAMES = new Set(['song', 'preset', 'instrument', 'instrumentbank', 'gig'])
const idLocks = new Map()
let historySequence = 0

function httpError (statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function objectNameFromRequest (req, segmentIndex) {
  const source = req.path || req.url
  const objectName = String(source.split('/')[segmentIndex] || '').toLowerCase()
  if (!OBJECT_NAMES.has(objectName)) throw httpError(400, 'Unsupported data type')
  return objectName
}

function validateId (value) {
  const text = String(value)
  if (!/^\d+$/.test(text) || Number(text) < 1) throw httpError(400, 'id must be a positive integer')
  return Number(text)
}

function validateBody (body, expectedId) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Request body must be a JSON object')
  }
  if (expectedId !== undefined && validateId(body.id) !== expectedId) {
    throw httpError(400, 'Body id must match route id')
  }
  return body
}

function resolveInsideDataRoot (...parts) {
  const root = path.resolve(config.filePath)
  const target = path.resolve(root, ...parts)
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw httpError(400, 'Invalid data path')
  return target
}

function dataFile (objectName, id) {
  if (!OBJECT_NAMES.has(objectName)) throw httpError(400, 'Unsupported data type')
  return resolveInsideDataRoot(objectName, `${validateId(id)}.json`)
}

async function atomicWriteJson (fileName, data) {
  const tempName = `${fileName}.${process.pid}.${Date.now()}.tmp`
  try {
    await fs.writeFile(tempName, JSON.stringify(data), 'utf8')
    await fs.rename(tempName, fileName)
  } catch (error) {
    await fs.unlink(tempName).catch(() => {})
    throw error
  }
}

async function writeHistorySnapshot (historyType, id, data) {
  if (historyType !== 'songpresets' && historyType !== 'preset') {
    throw httpError(400, 'Unsupported history type')
  }

  const historyFolder = resolveInsideDataRoot('history', historyType, String(validateId(id)))
  await fs.mkdir(historyFolder, { recursive: true })

  // The timestamp keeps files naturally sortable; the process-local sequence
  // prevents two saves in the same millisecond from selecting the same name.
  historySequence += 1
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = path.join(historyFolder, `${timestamp}-${process.pid}-${historySequence}.json`)
  await fs.writeFile(fileName, JSON.stringify(data), { encoding: 'utf8', flag: 'wx' })
  return fileName
}

async function allocateId (objectName) {
  const fileName = resolveInsideDataRoot(objectName, 'id', 'id.json')
  const previous = idLocks.get(fileName) || Promise.resolve()
  const operation = previous.catch(() => {}).then(async () => {
    const data = JSON.parse(await fs.readFile(fileName, 'utf8'))
    const currentId = validateId(data.id)
    await atomicWriteJson(fileName, { id: currentId + 1 })
    return { id: currentId }
  })
  idLocks.set(fileName, operation)
  try {
    return await operation
  } finally {
    if (idLocks.get(fileName) === operation) idLocks.delete(fileName)
  }
}

module.exports = {
  allocateId,
  atomicWriteJson,
  dataFile,
  httpError,
  objectNameFromRequest,
  resolveInsideDataRoot,
  writeHistorySnapshot,
  validateBody,
  validateId
}
