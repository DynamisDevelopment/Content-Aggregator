const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')
const { Cluster } = require('puppeteer-cluster')
const { v4: uuidv4 } = require('uuid')
const _ = require('lodash')

const router = new express.Router()

router.get('/watch/rumble/:src', async (req, res) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(`https://rumble.com/${req.params.src}.html`)
  await page.waitForSelector('.media-content')

  const content = await page.content()
  const $ = cheerio.load(content)

  const video = $('video').attr('src')

  res.send(video)
})

router.get('/watch/odysee/:src', async (req, res) => {
  let search = req.params.src.split('SLASH').join('/')

  const odysee = await axios.get(`https://odysee.com${search}`)

  const $ = cheerio.load(odysee.data)
  const info = $('[type="application/ld+json"]').html()
  const embed = JSON.parse(info)

  res.send(embed.embedUrl)
})

module.exports = router
