const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')
const { Cluster } = require('puppeteer-cluster')
const { v4: uuidv4 } = require('uuid')
const _ = require('lodash')

const router = new express.Router()

const fetchYoutube = async search => {
  const youtube = await axios.get(
    `https://youtube.googleapis.com/youtube/v3/search?part=snippet&order=viewCount&maxResults=25&q=${search}&key=AIzaSyBAREETLU26-c1F8JPZaSLJfqPhh3MmTD4`
  )

  youtube.data.items.forEach(video => {
    const id = uuidv4()
    video.label = 'YOUTUBE'
    video.pointer = id

    const pointers = []
    pointers.push({
      id,
      thumbnail: video.snippet.thumbnails.high.url,
      title: video.snippet.title,
      channelId: video.snippet.channelId,
      link: `https://www.youtube.com/embed/${video.id.videoId}`,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      label,
    })
  })

  return pointers
}

const fetchRumble = async search => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto(`https://rumble.com/search/video?q=${search}`, {
    waitUntil: 'networkidle2',
  })
  // await page.waitForSelector('.claim-list')
  const content = await page.content()
  const $ = cheerio.load(content)

  const videos = $('ol').find('.video-listing-entry')
  const pointers = []
  videos.each(function () {
    const title = $(this).find('.video-item--title').text()
    const id = uuidv4()

    pointers.push({
      id,
      thumbnail: $(this).find('.video-item--img').attr('src'),
      title,
      link: $(this).find('.video-item--a').attr('href'),
      label: 'RUMBLE',
      publishedAt: $(this).find('.video-item--time').attr('datetime'),
    })
  })

  return pointers
}

const fetchOdysee = async search => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto(`https://odysee.com/$/search?q=${search}`, {
    waitUntil: 'networkidle2',
  })
  await page.waitForSelector('.claim-list')

  const content = await page.content()
  const $ = cheerio.load(content)

  const videos = $('.claim-list').find('.claim-preview__wrapper')
  const pointers = []
  videos.each(function () {
    const id = uuidv4()
    const thumbnail = $(this)
      .find('.media__thumb')
      .attr('data-background-image')

    if (thumbnail) {
      const video = {
        id,
        thumbnail,
        title: $(this).find('.claim-preview__title').text(),
        link: $(this).find('.claim-preview > a').attr('href'),
        label: 'ODYSEE',
      }
      pointers.push(video)
    }
  })

  return content
}

router.get('/search/:search', async (req, res) => {
  let pointers = []

  // await fetchYoutube(req.params.search, pointers)
  const odysee = await fetchOdysee(req.params.search)
  const rumble = await fetchRumble(req.params.search)

  pointers = odysee.concat(rumble)

  let result
  result = _.uniqBy(pointers, point => point.title)
  result = _.orderBy(result, ['publishedAt'], ['desc'])
  res.send(result)
})

router.get('/youtube/:search', async (req, res) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(`https://www.youtube.com/results?search_query=viva+frei`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector('#contents')

  const content = await page.content()
  const $ = cheerio.load(content)

  const videos = $('ytd-item-section-renderer > #contents').find(
    '.ytd-video-renderer'
  )
  let refactored = []
  videos.each(function () {
    const id = uuidv4()
    const video = {
      id,
      thumbnail: $(this).find('yt-img-shadow > #img').attr('src'),
      title: $(this).find('#video-title').text().trim(),
      // link: $(this).find('.spa').attr('href'),
      label: 'YOUTUBE',
    }
    refactored.push(video)
  })

  res.send(refactored)
})

router.get('/rumble/:search', async (req, res) => {
  const content = await fetchRumble(req.params.search)

  res.send(content)
})

router.get('/bitchute/:search', async (req, res) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(
    `https://www.bitchute.com/search/?query=${req.params.search}&kind=video`
  )
  await page.waitForSelector('#main-content')

  const content = await page.content()
  const $ = cheerio.load(content)

  const videos = $('.results-list').find('.video-result-container')
  let refactored = []
  videos.each(function () {
    const id = uuidv4()
    const video = {
      id,
      thumbnail: $(this)
        .find('.video-result-image > img:first-child')
        .attr('src'),
      title: $(this).find('.video-result-title').text(),
      link: $(this).find('.spa').attr('href'),
      label: 'BITCHUTE',
    }
    refactored.push(video)
  })

  res.send(refactored)
})

router.get('/odysee/:search', async (req, res) => {
  const content = await fetchOdysee(req.params.search)

  res.send(content)
})

module.exports = router
