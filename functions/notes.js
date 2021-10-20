import {Pool} from 'pg';
import { streamer } from './lib/streamer'
import serverComponent from '../src/lib/server-component';

const pool = new Pool({connectionString: process.env.PG_URI, ssl: { rejectUnauthorized: false }});

exports.handler = streamer(async function(event, res, context) {
    function response(body, status) {
        res.setStatus(status || 200)
        res.setHeader('Content-Type', 'application/json')
        res.write(body)
        res.end()
    }

    const match = event.path.match(/\/notes\/?([^\/]+)?/)
    if (!match) {
        return  response(JSON.stringify({error: "Not Found"}), 404);
    }

    const location = event.queryStringParameters.location && JSON.parse(event.queryStringParameters.location);

    try {
        const noteId = match[1];
        const now = new Date();
        const data = event.body && JSON.parse(event.body)
        switch (event.httpMethod) {
            case 'GET':
                if (noteId) {
                    const {rows} = await pool.query('select * from notes where id = $1', [noteId,]);
                    return response(JSON.stringify(rows[0]))
                }

                const query = location && location.searchText ? [`select * from notes where title ilike $1 order by id desc`,
                ['%' + location.searchText + '%']] : ['select * from notes order by id desc']
                const {rows} = await pool.query.apply(pool, query);
                return response(JSON.stringify(rows))
            case 'POST':
                if (noteId) {
                    return response(JSON.stringify({error: "Method not allowed"}), 405)
                }
                const result = await pool.query(
                    'insert into notes (title, body, created_at, updated_at) values ($1, $2, $3, $3) returning id',
                    [data.title, data.body, now]
                ); 
                const insertedId = result.rows[0].id;
                return serverComponent(location, insertedId, res)
            case 'PUT':
                if (!noteId) {
                    return response(JSON.stringify({error: "Method not allowed"}), 405)
                }
                const updatedId = Number(noteId);
                await pool.query(
                    'update notes set title = $1, body = $2, updated_at = $3 where id = $4',
                    [data.title, data.body, now, updatedId]
                );
                return serverComponent(location, null, res)
            case 'DELETE':
                await pool.query('delete from notes where id = $1', [noteId]);
                return serverComponent(location, null, res)
        }
    } catch(err) {
        console.log(err);
        return response(JSON.stringify(err.toString()), 500);
    }
})