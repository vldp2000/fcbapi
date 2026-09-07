const express = require('express')
const cors = require('cors')
const config = require('./config/config')

const app = express()
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  next()
})
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: config.corsOrigins }))

let server
const { Server } = require('socket.io')
const io = new Server({
  allowEIO3: true,
  cors: { origin: config.corsOrigins }
})
io.on('connection', socket => {
  const messages = [
    config.viewProgramMessage,
    config.viewSongMessage,
    config.viewEditModeMessage,
    config.viewGigChangedMessage,
    config.controllerPresetVoluleMessage,
    config.controllerProgramMessage,
    config.controllerSongMessage,
    config.controllerGigMessage,
    config.controllerPedal1Message,
    config.controllerPedal2Message,
    config.controllerSyncMessage
  ]
  messages.forEach(message => socket.on(message, data => io.emit(message, data)))
})

require('./routes')(app)

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (err.code === 'ENOENT' ? 404 : 500)
  console.error(err)
  if (res.headersSent) return next(err)
  res.status(statusCode).send({ error: statusCode === 500 ? 'Internal server error' : err.message })
})

function start () {
  server = app.listen(config.httpPort, () => console.log(`listening on *:${config.httpPort}`))
  io.attach(server)
  return server
}

function shutdown (signal) {
  console.log(`${signal} received; shutting down`)
  io.close()
  if (server) server.close(() => process.exit(0))
}

if (require.main === module) {
  start()
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

module.exports = { app, start, shutdown }
