const fs = require('fs').promises
const path = require('path')
const store = require('../dataStore')

async function readAllFiles (objectName) {
  const folder = store.resolveInsideDataRoot(objectName)
  const files = (await fs.readdir(folder)).filter(file => file.endsWith('.json')).sort()
  return Promise.all(files.map(async file => JSON.parse(await fs.readFile(path.join(folder, file), 'utf8'))))
}

module.exports = {
  async readDataFromFile (req, res) {
    const objectName = store.objectNameFromRequest(req, 2)
    res.send(await readAllFiles(objectName))
  },

  async readDataByIdFromFile (req, res) {
    const objectName = store.objectNameFromRequest(req, 1)
    try {
      const fileName = store.dataFile(objectName, req.params.id)
      res.send(JSON.parse(await fs.readFile(fileName, 'utf8')))
    } catch (error) {
      if (error.code === 'ENOENT') throw store.httpError(404, `${objectName} not found`)
      throw error
    }
  },

  async getId (req, res) {
    const objectName = store.objectNameFromRequest(req, 2)
    res.send(await store.allocateId(objectName))
  },

  async getScheduledGigId (req, res) {
    const fileName = store.resolveInsideDataRoot('gig', 'id', 'currentgig.json')
    res.send(JSON.parse(await fs.readFile(fileName, 'utf8')))
  }
}
