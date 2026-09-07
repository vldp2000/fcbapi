const fs = require('fs').promises
const path = require('path')
const Joi = require('joi')
const config = require('./config/config')

const OBJECT_NAMES = new Set(['song', 'preset', 'instrument', 'instrumentbank', 'gig'])
const idSchema = Joi.number().integer().positive().required()
const bodySchema = Joi.object().required()
const idLocks = new Map()

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
  const result = idSchema.validate(value)
  if (result.error || !/^\d+$/.test(String(value))) throw httpError(400, 'id must be a positive integer')
  return Number(value)
}

function validateBody (body, expectedId) {
  const result = bodySchema.validate(body)
  if (result.error || !body || Array.isArray(body)) throw httpError(400, 'Request body must be a JSON object')
  if (expectedId !== undefined && validateId(body.id) !== expectedId) {
    throw httpError(400, 'Body id must match route id')
  }
  return normalizeObject(body)
}

function normalizeObject (value, key) {
  if (Array.isArray(value)) return value.map(item => normalizeObject(item))
  if (!value || typeof value !== 'object') return normalizeScalar(value, key)
  const result = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = normalizeObject(childValue, childKey)
  }
  return result
}

function normalizeScalar (value, key) {
  const integerFields = new Set([
    'id', 'refsong', 'refsongprogram', 'refinstrument', 'refinstrumentbank', 'refpreset',
    'midipedal', 'midipc', 'midichannel', 'sequencenumber', 'tempo', 'volume', 'pan',
    'reverbvalue', 'delayvalue', 'number', 'currentFlag'
  ])
  const flagFields = new Set(['muteflag', 'boostflag', 'reverbflag', 'delayflag', 'modeflag'])
  if (integerFields.has(key) && value !== '' && Number.isInteger(Number(value))) return Number(value)
  if (flagFields.has(key)) return value === true || value === 1 || value === '1' ? 1 : 0
  return value
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
  normalizeObject,
  objectNameFromRequest,
  resolveInsideDataRoot,
  validateBody,
  validateId
}
