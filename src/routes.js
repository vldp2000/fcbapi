const SaveDataController = require('./controllers/SaveDataController')
const ReadDataController = require('./controllers/ReadDataController')
const PresetUsageController = require('./controllers/PresetUsageController')

module.exports = (app) => {
  const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next)

  app.put('/song/:id', asyncHandler(SaveDataController.saveDataToFile))
  app.put('/songpresets/:id', asyncHandler(SaveDataController.saveSongPresetsWithHistory))
  app.get('/song/:id', asyncHandler(ReadDataController.readDataByIdFromFile))
  app.get('/history/songpresets/:id', asyncHandler(ReadDataController.readSongPresetHistory))
  app.get('/all/song', asyncHandler(ReadDataController.readDataFromFile))
  app.get('/id/song', asyncHandler(ReadDataController.getId))

  app.put('/instrument/:id', asyncHandler(SaveDataController.saveDataToFile))
  app.get('/all/instrument', asyncHandler(ReadDataController.readDataFromFile))
  app.get('/id/instrument', asyncHandler(ReadDataController.getId))

  app.put('/preset/:id', asyncHandler(SaveDataController.savePresetWithHistory))
  app.delete('/preset/:id', asyncHandler(SaveDataController.deleteDataFile))
  app.get('/all/preset', asyncHandler(ReadDataController.readDataFromFile))
  app.get('/id/preset', asyncHandler(ReadDataController.getId))
  app.get('/presetusage/:instrumentId/:midiPc', asyncHandler(PresetUsageController.getPresetUsage))

  app.put('/instrumentbank/:id', asyncHandler(SaveDataController.saveDataToFile))
  app.get('/all/instrumentbank', asyncHandler(ReadDataController.readDataFromFile))
  app.get('/id/instrumentbank', asyncHandler(ReadDataController.getId))

  app.put('/gig/:id', asyncHandler(SaveDataController.saveDataToFile))
  app.get('/all/gig', asyncHandler(ReadDataController.readDataFromFile))
  app.get('/id/gig', asyncHandler(ReadDataController.getId))
  app.get('/gig/:id', asyncHandler(ReadDataController.readDataByIdFromFile))

  app.get('/currentgig', asyncHandler(ReadDataController.getScheduledGigId))
  app.put('/currentgig', asyncHandler(SaveDataController.saveScheduledGigId))
}
