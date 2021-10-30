import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import path from 'path'
// import helmet from 'helmet'

import express, { NextFunction, Request, Response } from 'express'
import StatusCodes from 'http-status-codes'
import 'express-async-errors'

import Router from '@/routes'
import logger from '@/shared/Logger'

import {createServer, Server} from 'http'
import {createServer as createHttpsServer} from 'https'
import fs from 'fs'

import appRoot from 'app-root-path'
import winston from 'winston'
import expressWinston from 'express-winston'
import {Loggly} from 'winston-loggly-bulk'

const app = express()
const { BAD_REQUEST } = StatusCodes



/************************************************************************************
 *                              Set basic express settings
 ***********************************************************************************/

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Security
// if (process.env.NODE_ENV === 'production') {
//   app.use(helmet())
// }

// Print API errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.err(err, true)
  return res.status(BAD_REQUEST).json({
    error: err.message,
  })
})



/************************************************************************************
 *                              Serve front-end content
 ***********************************************************************************/

const viewsDir = path.join(__dirname, '../views')
app.set('views', viewsDir)
app.set('view engine', 'pug')
app.set('view engine', 'ejs')
const staticDir = path.join(__dirname, '../public')
app.use(express.static(staticDir))

app.use(expressWinston.logger({
  transports: [
    new winston.transports.Console(),
    // new winston.transports.File({
    //   filename: `${appRoot}/logs/app.log`,
    //   tailable: true,
    //   handleExceptions: true,
    // }),
    // new Loggly({
    //   subdomain: process.env.LOGGLY_SUBDOMAIN || '',
    //   token: process.env.LOGGLY_TOKEN || '',
    //   json: true,
    //   tags: ["HTTPS-Request"]
    // })
  ],
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.json()
  ),
  expressFormat: true,
  colorize: false,
  // ignoreRoute: function (req, res) { return false; },
  dynamicMeta:  (req: any, res: any) => {
    const httpRequest:any = {}
    const meta:any = {}
    if (req) {
      meta.httpRequest = httpRequest
      httpRequest.method = req.method
      httpRequest.url = `${req.protocol}://${req.get('host')}${req.originalUrl}`
      httpRequest.protocol = `HTTP/${req.httpVersion}`
      httpRequest.remoteIp = req.ip.indexOf(':') >= 0 ? req.ip.substring(req.ip.lastIndexOf(':') + 1) : req.ip   // just ipv4
      httpRequest.requestSize = req.socket.bytesRead
      httpRequest.userAgent = req.get('User-Agent')
      httpRequest.referrer = req.get('Referrer')
    }
  
    if (res) {
      meta.httpRequest = httpRequest
      httpRequest.status = res.statusCode
      if (res.body) {
        if (typeof res.body === 'object') {
          httpRequest.responseSize = JSON.stringify(res.body).length
        } else if (typeof res.body === 'string') {
          httpRequest.responseSize = res.body.length
        }
      }
    }
    return meta
  }
}))

app.use('/', Router)

app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console(),
    // new winston.transports.File({
    //   filename: `${appRoot}/logs/app.log`,
    //   tailable: true
    // }),
    new Loggly({
      subdomain: process.env.LOGGLY_SUBDOMAIN || '',
      token: process.env.LOGGLY_TOKEN || '',
      json: true,
      tags: ["HTTPS-Request"]
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.json()
  )
}))

let server: Server

if (process.env.NODE_ENV === 'development') {
  const privateKey  = fs.readFileSync(process.env.SSL_KEY || '')
  const certificate = fs.readFileSync(process.env.SSL_CERT || '')
  const credentials = {key: privateKey, cert: certificate}
  server = createHttpsServer(credentials, app)
} else {
  server = createServer(app)
}

export default server
