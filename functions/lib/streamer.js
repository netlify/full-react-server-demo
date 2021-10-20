import http from 'http'
import https from 'https'
import streams from 'memory-streams';

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

        console.log("Starting streaming request")
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
        this._req = parsedUrl.protocol === 'https:' ? https.request(this._url, options) : http.request(this._url, options)
        this._req_events.forEach((e) => {
            this._req.on(e.event, e.handler)
        })
        this._req_events = null
    }
}

export const streamer = (handler) => 
    async (event, context) => {
        if (!event.streaming_response) {
            console.log("Handling as non streaming", event.path)
            const writer = new streams.WritableStream();

            const headers = {}
            var status = 200

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
                    headers: headers
                }))

                handler(event, writer, context)
            })
            
        } 

        console.log("Handling as streaming", event.path)
        const res = new Response(event)

        handler(event, res, context)

        return new Promise((resolve) => {
            res.on('finish', () => {
                resolve({
                    statusCode: 200,
                    body: 'Done'
                })
            })
            res.on('error', (err) => {
                console.error('Error during request', err)
                resolve({
                    statusCode: 500,
                    body: `Error: ${err}`
                })
            })
        })
    }
