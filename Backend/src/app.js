const express = require('express')
const aggregateRouter = require('./routers/aggregate')
const videoRouter = require('./routers/video')

const app = express()
app.use(express.json())
app.use(aggregateRouter)
app.use(videoRouter)

module.exports = app
