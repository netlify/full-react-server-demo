const path = require("path")
const webpack = require("webpack")

const url = process.env.API_ENDPOINT || (process.env.CONTEXT === "production" ? process.env.URL : process.env.DEPLOY_PRIME_URL)

module.exports = {
  module: {
    rules: [
        {
          test: /\.client\.js/,
          use: {
            loader: path.resolve('./webpack/loaders/client-react-loader.js'),
          },
        },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
        'API_ENDPOINT': `"${url || "http://localhost:8888"}"`,
        'BASE_DIR': `"${__dirname}"`
    })
  ],
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    alias: {
        'pg-native': path.join(__dirname, 'webpack/aliases/pg-native.js'),
        'pgpass$': path.join(__dirname, 'webpack/aliases/pgpass.js'),
      },
  },
};
