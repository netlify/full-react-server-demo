import http from 'http'
import https from 'https'
import streams from 'memory-streams';

class Response {
    _req = null
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

        this._req.write(data)
    }

    end() {
        this._doRequest()

        this._req.end()
    }

    on(event, handler) {
        if (event === 'drain') {
            console.log("Got drain handler, triggering next tick")
            process.nextTick(handler)
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
                console.log("Lookup ", address, opts)
                if (opts.all) {
                    return callback(null, [{ address: ip, family }])
                }
                return callback(null, ip, family)
            },
            method: 'POST',
            headers: this._headers
        }
        this._req = parsedUrl.protocol === 'https:' ? https.request(this._url, options) : http.request(this._url, options)
        this._req.on('error', console.error)
        this._req.on('response', (resp) => console.log('got resp:', resp))
    }
}

export const streamer = (handler) => 
    async (event, context) => {
        if (!event.streaming_response) {
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

        const res = new Response(event)

        return handler(event, res, context)
    }
