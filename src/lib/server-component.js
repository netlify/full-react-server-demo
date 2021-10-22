import React from 'react';
import {renderToPipeableStream} from 'react-server-dom-webpack/writer.node.server';
import App from '../App.server';
import moduleMap from '../../dist/react-client-manifest.json'

async function serverComponent(location, redirectToId, res) {
    if (redirectToId) {
        location.selectedId = redirectToId
    }

    res.setHeader('Content-Type', 'application/text')
    res.setHeader('X-Location', JSON.stringify(location))

    return renderToPipeableStream(React.createElement(App, location), moduleMap).pipe(res)
}

export default serverComponent