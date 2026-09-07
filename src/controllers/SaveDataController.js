const fs = require('fs').promises
const PresetUsageController = require('./PresetUsageController')
const store = require('../dataStore')

module.exports = {
  async saveScheduledGigId (req, res) {
    const body = store.validateBody(req.body)
    body.id = store.validateId(body.id)
    const fileName = store.resolveInsideDataRoot('gig', 'id', 'currentgig.json')
    await store.atomicWriteJson(fileName, body)
    res.status(200).send({ message: 'OK' })
  },

  async saveDataToFile (req, res) {
    const objectName = store.objectNameFromRequest(req, 1)
    const id = store.validateId(req.params.id)
    const body = store.validateBody(req.body, id)
    await store.atomicWriteJson(store.dataFile(objectName, id), body)
    if (objectName === 'song' || objectName === 'preset') PresetUsageController.invalidateCache()
    res.status(200).send({ message: 'OK' })
  },

  async deleteDataFile (req, res) {
    const objectName = store.objectNameFromRequest(req, 1)
    await fs.unlink(store.dataFile(objectName, req.params.id))
    if (objectName === 'song' || objectName === 'preset') PresetUsageController.invalidateCache()
    res.status(200).send({ message: 'OK' })
  }
}
