# React Server Components Demo on Netlify

This is an adapted version of the official [React Server Components demo](https://github.com/reactjs/server-components-demo) that runs on Netlify using Netlify Functions.

Note that Server Components in general should be treated as experimental and it's not recommended to use this as a starting point for any real world production applications at this point.

## Getting Started

Make sure you have an internet reachable Postgres database that you're not too worried about. The demo app has no authentication or the like, so anyone with the URL can add and edit notes. One easy option is to setup a free [Database on Heroku](https://www.heroku.com/postgres) to play with.

Once you have that in place, copy the Postgress URI to the clipboard and you're ready to Deploy to Netlify:

[<img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify">](https://app.netlify.com/start/deploy?repository=https://github.com/netlify/full-react-server-demo)

Enter your Postgress URI for the PG_URI when prompted.

To run locally, clone your new repository to your local machine and from there run:

```
npm i
netlify dev
```

Note that there's currently no live reloading or the like, PRs to improve the experience will be welcomed.

