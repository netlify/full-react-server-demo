import { streamer } from './lib/streamer';
import serverComponent from '../src/lib/server-component';

exports.handler = streamer(async function(event, res) {
    const location = JSON.parse(event.queryStringParameters.location);

    return serverComponent(location, null, res)
})