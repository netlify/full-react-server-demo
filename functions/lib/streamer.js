const crypto = require('crypto')
const http = require('http')
const https = require('https')

const streams = require('memory-streams')

let id = null
const meta = {}

const promises = []

const logger = function() {
  console.log.call(console.log, {
    ts: Date.now(),
    streamer: id,
    msg: arguments,
    meta
  })
}

class Response {
    _req = null
    _req_events = []
    _headers = {}
    _ip = null
    _url = null

    constructor(event) {
        const { callback_url, target_ipv4 } = event.streaming_response
        this._url = callback_url
        this._ip = target_ipv4
        this._timings = {
            startAt: new Date(),
            dnsLookupAt: undefined,
            tcpConnectionAt: undefined,
            tlsHandshakeAt: undefined,
            firstByteAt: undefined,
            endAt: undefined
        }
    }


    setStatus(code) {
        if (this._req) {
            throw("Cannot set status after first write")
        }
        this._headers[`s-status`] = code
    }

    setHeader(key, value) {
        if (this._req) {
            throw("Cannot set headers after first write")
        }
        this._headers[`s-${key}`] = value
    }

    write(data) {
        this._doRequest()

        return this._req.write(data)
    }

    end() {
        this._doRequest()

        return this._req.end()
    }

    on(event, handler) {
        if (this._req) {
            this._req.on(event, handler)
        } else {
            this._req_events.push({event, handler})
        }
    }

    _doRequest() {
        if (this._req) { return }

        const parsedUrl = new URL(this._url)
        const family = 4
        const ip = this._ip
        const options = {
            // eslint-disable-next-line default-param-last
            lookup: (address, opts = {}, callback) => {
                if (opts.all) {
                    return callback(null, [{ address: ip, family }])
                }
                return callback(null, ip, family)
            },
            method: 'POST',
            headers: this._headers
        }
        parsedUrl.searchParams.append('stream_id', id)
        logger("Streaming request starting", parsedUrl)
        promises.push(new Promise((resolve) => {
            const cb = (res) => {
                logger('got response', res.statusCode)

                const chunks = []
                res.once('readable', () => {
                    this._timings.firstByteAt = new Date()
                })
                res.on('data', (d) => chunks.push(d))
                res.on('end', () => {
                    this._timings.endAt = new Date()

                    this._logTimings()
                    resolve()
                })
                res.on('error', (err) => {
                    resolve()
                })
            }
            this._req = parsedUrl.protocol === 'https:' ? https.request(this._url, options, cb) : http.request(this._url, options, cb)
            this._req_events.forEach((e) => {
                this._req.on(e.event, (ev) => e.handler(ev))
            })
            this._req.on('socket', (socket) => {
                socket.on('lookup', () => {
                  this._timings.dnsLookupAt = new Date()
                })
                socket.on('connect', () => {
                  this._timings.tcpConnectionAt = new Date()
                })
                socket.on('secureConnect', () => {
                  this._timings.tlsHandshakeAt = new Date()
                })
              })
            this._req_events = null
            this._req.flushHeaders()
        }))
    }

    _logTimings() {
        logger({
            dns: this._timings.dnsLookupAt - this._timings.startAt,
            tcp: this._timings.tcpConnectionAt - (this._timings.dnsLookupAt || this._timings.startAt),
            tls: this._timings.tlsHandshakeAt - this._timings.tcpConnectionAt,
            ttfb: this._timings.firstByteAt - (this._timings.tlsHandshakeAt || this._timings.tcpConnectionAt),
            ctt: this._timings.endAt - (this._timings.firstByteAt),
            total: this._timings.endAt - this._timings.startAt
        })
    }
}

export const streamer = (handler) =>
    async (event, context) => {
        id = crypto.randomBytes(4).toString("hex");
        meta.req_id = event.headers['x-nf-request-id']
        // meta.aws_id = context.awsRequestId
        // meta.aws_arn = context.invokedFunctionArn

        if (!event.streaming_response) {
            logger("Handling as non streaming", event.path)
            const writer = new streams.WritableStream();

            const headers = {}
            let status = 200

            writer.setHeader = (key, value) => {
                headers[key] = value
            }

            writer.setStatus = (code) => {
                status = code
            }

            return new Promise(async (resolve, reject) => {
                writer.on('finish', () => resolve({
                    statusCode: status,
                    body: writer.toString(),
                    headers
                }))

                if (handler.length === 2) {
                    handler(event, writer)
                } else {
                    handler(event, context, writer)
                }
            })

        }

        logger("Handling as streaming", event.path)
        const res = new Response(event)

        handler(event, context, res)

        promises.push(new Promise((resolve) => {
            res.on('finish', resolve)
            res.on('error', resolve)
        }))

        logger("waiting for streaming request to finish")
        await Promise.all(promises)
        logger("Streaming execution done")
    }
