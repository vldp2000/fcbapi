const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const tempRoot = path.join(os.tmpdir(), `fcb-api-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
fs.mkdirSync(tempRoot, { recursive: true })
process.env.FCB_DATA_PATH = tempRoot

const PresetUsageController = require('../src/controllers/PresetUsageController')
const ReadDataController = require('../src/controllers/ReadDataController')
const SaveDataController = require('../src/controllers/SaveDataController')
const config = require('../src/config/config')
const routes = require('../src/routes')

function writeJson (fileName, data) {
  fs.writeFileSync(fileName, JSON.stringify(data), 'utf8')
}

function makeResponse () {
  return {
    statusCode: 200,
    payload: null,
    status (statusCode) {
      this.statusCode = statusCode
      return this
    },
    send (payload) {
      this.payload = payload
      return this
    }
  }
}

async function callGetPresetUsage (instrumentId, midiPc) {
  const res = makeResponse()
  await PresetUsageController.getPresetUsage({
    params: {
      instrumentId: String(instrumentId),
      midiPc: String(midiPc)
    }
  }, res)
  return res
}

function createDataFolders () {
  fs.rmSync(tempRoot, { recursive: true, force: true })
  fs.mkdirSync(path.join(tempRoot, 'preset'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'preset', 'id'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'song'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'song', 'id'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'instrument'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'instrument', 'id'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'instrumentbank'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'instrumentbank', 'id'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'gig'), { recursive: true })
  fs.mkdirSync(path.join(tempRoot, 'gig', 'id'), { recursive: true })
}

function createInitialData () {
  createDataFolders()
  writeJson(path.join(tempRoot, 'preset', '120.json'), {
    id: 120,
    name: '24.Drive Fat',
    refinstrument: 1,
    midipc: 24
  })
  writeJson(path.join(tempRoot, 'preset', '121.json'), {
    id: 121,
    name: '24.Drive Fat Copy',
    refinstrument: 1,
    midipc: 24
  })
  writeJson(path.join(tempRoot, 'preset', '220.json'), {
    id: 220,
    name: '42.String Pad',
    refinstrument: 2,
    midipc: 42
  })
  writeJson(path.join(tempRoot, 'song', '7.json'), {
    id: 7,
    name: 'Faun oo',
    programList: [
      {
        id: 3,
        name: 'C',
        presetList: [
          {
            id: 9,
            refinstrument: 1,
            refpreset: 120,
            volume: 91
          },
          {
            id: 10,
            refinstrument: 2,
            refpreset: 220,
            volume: 66
          }
        ]
      }
    ]
  })
  writeJson(path.join(tempRoot, 'instrument', '1.json'), {
    id: 1,
    name: 'BiasFX iPad',
    midichannel: 6
  })
  writeJson(path.join(tempRoot, 'instrument', '2.json'), {
    id: 2,
    name: 'Alchemy',
    midichannel: 2
  })
  writeJson(path.join(tempRoot, 'gig', '2.json'), {
    id: 2,
    name: 'Sydney2024'
  })
  writeJson(path.join(tempRoot, 'gig', 'id', 'currentgig.json'), {
    id: 2
  })
  writeJson(path.join(tempRoot, 'song', 'id', 'id.json'), {
    id: 30
  })
  writeJson(path.join(tempRoot, 'preset', 'id', 'id.json'), {
    id: 300
  })
  fs.writeFileSync(path.join(tempRoot, 'song', 'notes.txt'), 'ignored', 'utf8')
}

async function withFreshData (test) {
  PresetUsageController.invalidateCache()
  createInitialData()
  await test()
}

async function testPresetUsageByActualPreset () {
  const res = await callGetPresetUsage(1, 24)

  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.payload.instrumentId, 1)
  assert.strictEqual(res.payload.midiPc, 24)
  assert.strictEqual(res.payload.usageCount, 1)
  assert.strictEqual(res.payload.usages[0].songName, 'Faun oo')
  assert.strictEqual(res.payload.usages[0].programName, 'C')
  assert.strictEqual(res.payload.usages[0].presetName, '24.Drive Fat')
  assert.strictEqual(res.payload.usages[0].volume, 91)
}

async function testPresetUsageIncludesPresetCopiesWithSamePc () {
  writeJson(path.join(tempRoot, 'song', '8.json'), {
    id: 8,
    name: 'Second Song',
    programList: [
      {
        id: 1,
        name: 'Intro',
        presetList: [
          {
            id: 1,
            refinstrument: 1,
            refpreset: 121,
            volume: 77
          }
        ]
      }
    ]
  })

  const res = await callGetPresetUsage(1, 24)

  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.payload.usageCount, 2)
  assert.deepStrictEqual(
    res.payload.usages.map(usage => usage.songName).sort(),
    ['Faun oo', 'Second Song']
  )
}

async function testPresetUsageValidation () {
  const res = makeResponse()
  await PresetUsageController.getPresetUsage({
    params: {
      instrumentId: 'abc',
      midiPc: '24'
    }
  }, res)

  assert.strictEqual(res.statusCode, 400)
  assert.strictEqual(res.payload.error, 'instrumentId and midiPc must be numbers')
}

async function testPresetUsageReturnsEmptyUsageList () {
  const res = await callGetPresetUsage(6, 127)

  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.payload.usageCount, 0)
  assert.deepStrictEqual(res.payload.usages, [])
}

async function testPresetUsageSkipsBrokenSongReferences () {
  writeJson(path.join(tempRoot, 'song', '9.json'), {
    id: 9,
    name: 'Broken References',
    programList: [
      null,
      {
        id: 1,
        tytle: 'Legacy title'
      },
      {
        id: 2,
        tytle: 'Uses Missing Preset',
        presetList: [
          {
            id: 1,
            refinstrument: 1,
            refpreset: 999,
            volume: 50
          }
        ]
      },
      {
        id: 3,
        tytle: 'Legacy D',
        presetList: [
          {
            id: 2,
            refinstrument: 1,
            refpreset: 120,
            volume: 82
          }
        ]
      }
    ]
  })

  PresetUsageController.invalidateCache()
  const res = await callGetPresetUsage(1, 24)

  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.payload.usageCount, 2)
  assert(res.payload.usages.find(usage => usage.programName === 'Legacy D'))
}

async function testSaveDataInvalidatesPresetUsageCache () {
  let res = await callGetPresetUsage(2, 42)
  assert.strictEqual(res.payload.usageCount, 1)

  const updatedSong = {
    id: 7,
    name: 'Faun oo',
    programList: [
      {
        id: 3,
        name: 'C',
        presetList: [
          {
            id: 10,
            refinstrument: 2,
            refpreset: 220,
            volume: 66
          }
        ]
      },
      {
        id: 4,
        name: 'D',
        presetList: [
          {
            id: 11,
            refinstrument: 2,
            refpreset: 220,
            volume: 72
          }
        ]
      }
    ]
  }

  res = makeResponse()
  await SaveDataController.saveDataToFile({
    url: '/song/7',
    params: {
      id: 7
    },
    body: updatedSong
  }, res)

  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempRoot, 'song', '7.json'), 'utf8')), updatedSong)

  res = await callGetPresetUsage(2, 42)
  assert.strictEqual(res.payload.usageCount, 2)
}

async function testSaveDataWritesNonPresetDataWithoutInvalidatingPresetUsageCache () {
  let invalidateCalls = 0
  const originalInvalidateCache = PresetUsageController.invalidateCache
  PresetUsageController.invalidateCache = function () {
    invalidateCalls += 1
    originalInvalidateCache()
  }

  try {
    const res = makeResponse()
    const instrument = {
      id: 3,
      name: 'SampleTank',
      midichannel: 1
    }

    await SaveDataController.saveDataToFile({
      url: '/instrument/3',
      params: {
        id: 3
      },
      body: instrument
    }, res)

    assert.strictEqual(res.statusCode, 200)
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempRoot, 'instrument', '3.json'), 'utf8')), instrument)
    assert.strictEqual(invalidateCalls, 0)
  } finally {
    PresetUsageController.invalidateCache = originalInvalidateCache
  }
}

async function testSaveDataRejectsMissingFolder () {
  fs.rmSync(path.join(tempRoot, 'instrument'), { recursive: true, force: true })
  await assert.rejects(() => SaveDataController.saveDataToFile({
    url: '/instrument/1',
    params: {
      id: 1
    },
    body: {
      id: 1
    }
  }, makeResponse()), error => error.code === 'ENOENT')
}

async function testSaveSongPresetsWritesImmutableHistory () {
  const firstSong = {
    id: 7,
    name: 'Faun oo',
    programList: [{ id: 1, presetList: [{ id: 1, volume: 70 }] }]
  }
  const secondSong = {
    id: 7,
    name: 'Faun oo',
    programList: [{ id: 1, presetList: [{ id: 1, volume: 85 }] }]
  }

  await SaveDataController.saveSongPresetsWithHistory({
    params: { id: 7 },
    body: firstSong
  }, makeResponse())
  await SaveDataController.saveSongPresetsWithHistory({
    params: { id: 7 },
    body: secondSong
  }, makeResponse())

  const historyFolder = path.join(tempRoot, 'history', 'songpresets', '7')
  const snapshots = fs.readdirSync(historyFolder).map(fileName =>
    JSON.parse(fs.readFileSync(path.join(historyFolder, fileName), 'utf8')))

  assert.strictEqual(snapshots.length, 2)
  assert(snapshots.find(snapshot => snapshot.programList[0].presetList[0].volume === 70))
  assert(snapshots.find(snapshot => snapshot.programList[0].presetList[0].volume === 85))
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempRoot, 'song', '7.json'), 'utf8')), secondSong)
}

async function testReadSongPresetHistoryReturnsNewestFirst () {
  const olderFolder = path.join(tempRoot, 'history', 'songpresets', '7')
  fs.mkdirSync(olderFolder, { recursive: true })
  const olderFile = path.join(olderFolder, 'older.json')
  writeJson(olderFile, {
    id: 7,
    name: 'Faun oo',
    programList: [{ id: 1, presetList: [{ volume: 70 }] }]
  })
  const olderTime = new Date('2026-09-07T10:00:00.000Z')
  fs.utimesSync(olderFile, olderTime, olderTime)

  const newerFile = path.join(olderFolder, 'newer.json')
  writeJson(newerFile, {
    id: 7,
    name: 'Faun oo',
    programList: [{ id: 1, presetList: [{ volume: 85 }] }]
  })
  const newerTime = new Date('2026-09-08T10:00:00.000Z')
  fs.utimesSync(newerFile, newerTime, newerTime)

  const res = makeResponse()
  await ReadDataController.readSongPresetHistory({ params: { id: 7 } }, res)

  assert.deepStrictEqual(res.payload.map(record => record.id), ['newer.json', 'older.json'])
  assert.strictEqual(res.payload[0].songName, 'Faun oo')
  assert.strictEqual(res.payload[0].programList[0].presetList[0].volume, 85)
}

async function testReadSongPresetHistoryReturnsEmptyListWhenMissing () {
  const res = makeResponse()
  await ReadDataController.readSongPresetHistory({ params: { id: 999 } }, res)
  assert.deepStrictEqual(res.payload, [])
}

async function testSavePresetWritesImmutableHistory () {
  const preset = {
    id: 120,
    name: 'Updated Drive',
    refinstrument: 1,
    midipc: 25
  }

  await SaveDataController.savePresetWithHistory({
    params: { id: 120 },
    body: preset
  }, makeResponse())

  const historyFolder = path.join(tempRoot, 'history', 'preset', '120')
  const historyFiles = fs.readdirSync(historyFolder)
  assert.strictEqual(historyFiles.length, 1)
  assert.deepStrictEqual(
    JSON.parse(fs.readFileSync(path.join(historyFolder, historyFiles[0]), 'utf8')),
    preset
  )
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempRoot, 'preset', '120.json'), 'utf8')), preset)
}

async function testDeletePresetRemovesFileAndInvalidatesPresetUsageCache () {
  let res = await callGetPresetUsage(1, 24)
  assert.strictEqual(res.payload.usageCount, 1)

  res = makeResponse()
  await SaveDataController.deleteDataFile({
    url: '/preset/121',
    params: {
      id: 121
    }
  }, res)

  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(fs.existsSync(path.join(tempRoot, 'preset', '121.json')), false)
}

async function testDeleteDataRejectsWhenFileIsMissing () {
  await assert.rejects(() => SaveDataController.deleteDataFile({
    url: '/preset/999',
    params: {
      id: 999
    }
  }, makeResponse()), error => error.code === 'ENOENT')
}

async function testSaveScheduledGigId () {
  const res = makeResponse()
  await SaveDataController.saveScheduledGigId({
    body: {
      id: 2
    }
  }, res)

  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(
    JSON.parse(fs.readFileSync(path.join(tempRoot, 'gig', 'id', 'currentgig.json'), 'utf8')),
    { id: 2 }
  )
}

async function testSaveScheduledGigIdRejectsWhenFolderIsMissing () {
  fs.rmSync(path.join(tempRoot, 'gig', 'id'), { recursive: true, force: true })

  await assert.rejects(() => SaveDataController.saveScheduledGigId({
    body: {
      id: 3
    }
  }, makeResponse()), error => error.code === 'ENOENT')
}

async function testReadDataFromFileReadsAllJsonFilesOnly () {
  const res = makeResponse()
  await ReadDataController.readDataFromFile({
    url: '/all/song',
    params: {}
  }, res)

  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.payload.map(song => song.id), [7])
}

async function testReadDataByIdFromFileReadsSingleObject () {
  const res = makeResponse()
  await ReadDataController.readDataByIdFromFile({
    url: '/song/7',
    params: {
      id: 7
    }
  }, res)

  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(res.payload.id, 7)
  assert.strictEqual(res.payload.name, 'Faun oo')
}

async function testReadRejectsPathTraversal () {
  await assert.rejects(() => ReadDataController.readDataByIdFromFile({
    url: '/song/..%2F..%2Fpackage',
    params: {
      id: '../../package'
    }
  }, makeResponse()), error => error.statusCode === 400)
}

async function testGetIdReturnsCurrentIdAndIncrementsStoredId () {
  const res = makeResponse()
  await ReadDataController.getId({
    url: '/id/song'
  }, res)

  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.payload, { id: 30 })

  await new Promise(resolve => setTimeout(resolve, 20))
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempRoot, 'song', 'id', 'id.json'), 'utf8')), { id: 31 })
}

async function testGetIdSerializesConcurrentAllocations () {
  const first = makeResponse()
  const second = makeResponse()
  await Promise.all([
    ReadDataController.getId({ url: '/id/song' }, first),
    ReadDataController.getId({ url: '/id/song' }, second)
  ])
  assert.deepStrictEqual([first.payload.id, second.payload.id].sort(), [30, 31])
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(tempRoot, 'song', 'id', 'id.json'), 'utf8')), { id: 32 })
}

async function testSaveRejectsTraversalAndMismatchedBodyId () {
  await assert.rejects(() => SaveDataController.saveDataToFile({
    url: '/song/../../outside',
    params: { id: '../../outside' },
    body: { id: 7 }
  }, makeResponse()), error => error.statusCode === 400)

  await assert.rejects(() => SaveDataController.saveDataToFile({
    url: '/song/7',
    params: { id: 7 },
    body: { id: 8 }
  }, makeResponse()), error => error.statusCode === 400)
}

async function testGetScheduledGigIdReadsCurrentGig () {
  const res = makeResponse()
  await ReadDataController.getScheduledGigId({}, res)

  assert.strictEqual(res.statusCode, 200)
  assert.deepStrictEqual(res.payload, { id: 2 })
}

function testRoutesRegisterApiBusinessEndpoints () {
  const registeredRoutes = []
  routes({
    get (routePath, handler) {
      registeredRoutes.push({ method: 'GET', routePath })
    },
    put () {},
    delete () {}
  })

  assert.deepStrictEqual(registeredRoutes, [
    { method: 'GET', routePath: '/song/:id' },
    { method: 'GET', routePath: '/history/songpresets/:id' },
    { method: 'GET', routePath: '/all/song' },
    { method: 'GET', routePath: '/id/song' },
    { method: 'GET', routePath: '/all/instrument' },
    { method: 'GET', routePath: '/id/instrument' },
    { method: 'GET', routePath: '/all/preset' },
    { method: 'GET', routePath: '/id/preset' },
    { method: 'GET', routePath: '/presetusage/:instrumentId/:midiPc' },
    { method: 'GET', routePath: '/all/instrumentbank' },
    { method: 'GET', routePath: '/id/instrumentbank' },
    { method: 'GET', routePath: '/all/gig' },
    { method: 'GET', routePath: '/id/gig' },
    { method: 'GET', routePath: '/gig/:id' },
    { method: 'GET', routePath: '/currentgig' }
  ])
}

function testRoutesRegisterApiWriteEndpoints () {
  const registeredRoutes = []
  routes({
    get () {},
    put (routePath, handler) {
      registeredRoutes.push({ method: 'PUT', routePath })
    },
    delete (routePath, handler) {
      registeredRoutes.push({ method: 'DELETE', routePath })
    }
  })

  assert.deepStrictEqual(registeredRoutes, [
    { method: 'PUT', routePath: '/song/:id' },
    { method: 'PUT', routePath: '/songpresets/:id' },
    { method: 'PUT', routePath: '/instrument/:id' },
    { method: 'PUT', routePath: '/preset/:id' },
    { method: 'DELETE', routePath: '/preset/:id' },
    { method: 'PUT', routePath: '/instrumentbank/:id' },
    { method: 'PUT', routePath: '/gig/:id' },
    { method: 'PUT', routePath: '/currentgig' }
  ])
}

function testSocketRelayIncludesGigChangedMessage () {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8')

  assert.strictEqual(config.viewGigChangedMessage, 'VIEW_GIG_CHANGED_MESSAGE')
  assert(appSource.includes('config.viewGigChangedMessage'), 'app.js should relay gig changed messages over Socket.IO')
}

async function run () {
  try {
    const tests = [
      testPresetUsageByActualPreset,
      testPresetUsageIncludesPresetCopiesWithSamePc,
      testPresetUsageValidation,
      testPresetUsageReturnsEmptyUsageList,
      testPresetUsageSkipsBrokenSongReferences,
      testSaveDataInvalidatesPresetUsageCache,
      testSaveSongPresetsWritesImmutableHistory,
      testReadSongPresetHistoryReturnsNewestFirst,
      testReadSongPresetHistoryReturnsEmptyListWhenMissing,
      testSavePresetWritesImmutableHistory,
      testSaveDataWritesNonPresetDataWithoutInvalidatingPresetUsageCache,
      testSaveDataRejectsMissingFolder,
      testDeletePresetRemovesFileAndInvalidatesPresetUsageCache,
      testDeleteDataRejectsWhenFileIsMissing,
      testSaveScheduledGigId,
      testSaveScheduledGigIdRejectsWhenFolderIsMissing,
      testReadDataFromFileReadsAllJsonFilesOnly,
      testReadDataByIdFromFileReadsSingleObject,
      testReadRejectsPathTraversal,
      testGetIdReturnsCurrentIdAndIncrementsStoredId,
      testGetIdSerializesConcurrentAllocations,
      testSaveRejectsTraversalAndMismatchedBodyId,
      testGetScheduledGigIdReadsCurrentGig,
      testRoutesRegisterApiBusinessEndpoints,
      testRoutesRegisterApiWriteEndpoints,
      testSocketRelayIncludesGigChangedMessage
    ]

    for (let test of tests) {
      await withFreshData(test)
      console.log(`OK ${test.name}`)
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
