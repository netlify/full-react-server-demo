import React from 'react';
import {pipeToNodeWritable} from 'react-server-dom-webpack/writer.node.server';
import App from '../App.server';
import moduleMap from '../../dist/react-client-manifest.json'

async function serverComponent(location, redirectToId, res) {
    if (redirectToId) {
        location.selectedId = redirectToId
    }

    res.setHeader('Content-Type', 'application/text')
    res.setHeader('X-Location', JSON.stringify(location))

    console.log("pipeNode", res)

    return pipeToNodeWritable(React.createElement(App, location), res, moduleMap)
}

export default serverComponent