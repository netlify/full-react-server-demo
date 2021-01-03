#!/usr/bin/env node
const {seed, connect} = require("./seed")

// Don't run if we've already built before
if (process.env.CACHED_COMMIT_REF) {
    process.exit(0)
}

const connectionString = process.env.PG_URI

if (!connectionString) {
    console.log("Make sure to configure a PG_URI connection string")
    process.exit(1)
}

const pool = connect()

async function seedIfNeeded() {
    const pool = connect();
    console.log("Checking table")
    try {
        await pool.query(`select count(*) from notes`)
    } catch (err) {
        if (err.toString().match(/relation "[^]+" does not exist/)) {
            return seed()
        }
        console.error(err)
        process.exit(1)
    }

}

seedIfNeeded()
