'use strict'
const test = require('tape')
const https = require('https')
const url = require('url')
const fs = require('fs')
const parseLinkHeader = require('http-link').parse
const N3 = require('n3');

const u1 = 'https://www.w3.org/People/Sandro/ping'

test('https get', t => {
  t.plan(2)
  const options = url.parse(u1)
  options.agent = false

  const req = https.get(options, (res) => {
    t.equal(res.statusCode, 200)
    res.on('data', (data) => {
      t.equal(''+data, 'pong\n')
    })
    res.on('close', () => {
      t.end()
    })
  }).on('error', (e) => {
    console.log(`Got error: ${e.message}`);
  })
})

const aliceroot = 'https://alicedemo.databox.me/'
const alicepem = fs.readFileSync('keys/alicedemo.databox.me.pem')

test('get alice with cert', t => {
  t.plan(4)
  const options = url.parse(aliceroot)
  options.agent = false
  options.key =  alicepem
  options.cert = alicepem
  options.method = 'GET'
  
  const parser = N3.Parser()
  const triples = []
  parser.parse(function (error, triple, prefixes) {
    triple && triples.push(triple)
  })
  
  let buf = ''
  
  const req = https.request(options, (res) => {
    //console.log(res.headers.link)
    const linksArray = parseLinkHeader(res.headers.link)
    const links = {}
    for (let obj of linksArray) {
      if (links[obj.rel]) {
        links[obj.rel].push(obj)
      } else {
        links[obj.rel] = [obj]
      }
    }

    //console.log(linksArray)
    //console.log(links)
    t.equal(links.acl[0].href, aliceroot+',acl')
    t.equal(links.meta[0].href, aliceroot+',meta')
    //t.equal(links.type.url, 'http://www.w3.org/ns/ldp#BasicContainer')
    t.equal(res.statusCode, 200)

    //console.log(`HEADERS: ${JSON.stringify(res.headers)}`)
    // res.headers.link
    // res.user
    res.setEncoding('utf8');
    res.on('data', (data) => {
      parser.addChunk(data)
      buf += data
    })
    res.on('end', () => {
      //console.log('end')
      parser.end()
      console.log(`got ${triples.length} triples`)
      //console.log(triples)
      t.assert(triples.length > 2)
      t.end()
    })
  })
  req.on('error', (e) => {
    console.log(`Got error: ${e.message}`);
  })
  req.setHeader('Accept', 'text/turtle')
  req.end()
})




/*
test('timing test', function (t) {
  t.plan(2)

  t.equal(typeof Date.now, 'function')
  var start = Date.now()

  setTimeout(function () {
    t.equal(Date.now() - start, 100)
  }, 100)
})
*/
