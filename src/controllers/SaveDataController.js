const config = require('../config/config')
const fs = require('fs')
const promisify = require('promisify-node')
const PresetUsageController = require('./PresetUsageController')

const writeFile = promisify(fs.writeFile)
const unlink = promisify(fs.unlink)

function getFileName (objName, id) {    
  const result = config.filePath + objName.toLowerCase() + '/' + id + '.json'
  console.log(  `Get file name  ==>> ${result}`)
  return result
}


module.exports = {

  async saveScheduledGigId (req, res) {
    const fileName = config.filePath + 'gig/id/currentgig.json'
    // console.log(fileName)

    var jsonContent = JSON.stringify(req.body)
    try {
      await writeFile(fileName, jsonContent, 'utf8')
      res.status(200).send({
        message: 'OK'
      })
    } catch (err) {
      console.log("An error occured while writing saveScheduledGigId to File.")
      res.status(500).send({
        error: `an error has occured trying to save data ${err}`
      })
    }
  },

  async saveDataToFile (req, res) {
    // console.log(' ---->>> Save Data <<<<< ')
    // console.log(req.url)
    const objName = req.url.split("/")[1]
    const fileName = getFileName(objName, req.params.id)

    // stringify JSON Object
    var jsonContent = JSON.stringify(req.body)

    try {
      await writeFile(fileName, jsonContent, 'utf8')
      if (objName === 'song' || objName === 'preset') {
        PresetUsageController.invalidateCache()
      }
      res.status(200).send({
        message: 'OK'
      })
    } catch (err) {
      console.log("An error occured while writing JSON Object to File.")
      res.status(500).send({
        error: `an error has occured trying to save data ${err}`
      })
    }
  },

  async deleteDataFile (req, res) {
    const objName = req.url.split("/")[1]
    const fileName = getFileName(objName, req.params.id)

    try {
      await unlink(fileName)
      if (objName === 'song' || objName === 'preset') {
        PresetUsageController.invalidateCache()
      }
      res.status(200).send({
        message: 'OK'
      })
    } catch (err) {
      console.log("An error occured while deleting JSON Object file.")
      res.status(500).send({
        error: `an error has occured trying to delete data ${err}`
      })
    }
  }
}
