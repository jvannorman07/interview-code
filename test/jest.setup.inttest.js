import fs from 'fs'
import timekeeper from 'timekeeper'
import { requestShutdown } from '../src/providers/shutdown'
import { knex } from '../src/providers/db'
import { createServer } from 'http'
import config from '../src/config'
import { makeApp } from '../src/web/app'

// increase timeout from 5s to 30s
jest.setTimeout(30000)

const truncateSql = fs.readFileSync(`${__dirname}/truncate-tables.sql`, 'utf8')
let httpServer

beforeAll(async () => {
  // Create our HTTP server
  httpServer = createServer()

  // Make our application (loading all the middleware, etc)
  const app = await makeApp({ httpServer })

  // Add our application to our HTTP server
  httpServer.addListener('request', app)

  // And finally, we open the listen port
  const port = parseInt(config.app.port, 10)

  return new Promise((resolve) => httpServer.listen(port, resolve))
})

// Always clean the DB to start
beforeEach(async () => {
  try {
    await knex.raw(truncateSql)
  } catch (error) {
    console.log(error)
  }
})

// Gracefully close connections so jest will end
afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve))
  return requestShutdown()
})

afterEach(() => timekeeper.reset())
