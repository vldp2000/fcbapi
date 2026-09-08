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

  async readSongPresetHistory (req, res) {
    const songId = store.validateId(req.params.id)
    const folder = store.resolveInsideDataRoot('history', 'songpresets', String(songId))
    let files
    try {
      files = (await fs.readdir(folder)).filter(file => file.endsWith('.json'))
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.send([])
        return
      }
      throw error
    }

    const records = await Promise.all(files.map(async file => {
      const fileName = path.join(folder, file)
      const [snapshot, fileStats] = await Promise.all([
        fs.readFile(fileName, 'utf8').then(JSON.parse),
        fs.stat(fileName)
      ])
      return {
        id: file,
        savedAt: fileStats.mtime.toISOString(),
        songName: snapshot.name || '',
        programList: Array.isArray(snapshot.programList) ? snapshot.programList : []
      }
    }))

    records.sort((left, right) => right.savedAt.localeCompare(left.savedAt) || right.id.localeCompare(left.id))
    res.send(records)
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
