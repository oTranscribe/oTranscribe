var path = require('path');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    app: ['./src/index.js'] // This is the main file that gets loaded first; the "bootstrap", if you will.
  },
  output: { // Transpiled and bundled output gets put in `build/bundle.js`.
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'   // Really, you want to upload index.htm and assets/bundle.js
  },

  // This makes it easier to debug scripts by listing line number of whichever file
  // threw the exception or console.log or whathaveyounot.
  devtool: 'inline-source-map',

  module: {
    loaders: [
      {
        test: /\.js?$/, // Another convention is to use the .es6 filetype, but you then
                        // have to supply that explicitly in import statements, which isn't cool.
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          cacheDirectory: true,
          presets: ['es2015', 'stage-2']
        }
          
      },
      // This nifty bit of magic right here allows us to load entire JSON files
      // synchronously using `require`, just like in NodeJS.
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      // Extract css files
      {
          test: /\.scss$/,
          loader: ExtractTextPlugin.extract(['css','sass'])
          
      }
    ]
  },
  // Use the plugin to specify the resulting filename (and add needed behavior to the compiler)
  plugins: [
      new ExtractTextPlugin("style.css"),
      new CopyWebpackPlugin([
          // {
          //     from: './src/html/',
          //     to: './'
          // }
          {
              from: './node_modules/webl10n/l10n.js'
          }
      ]),
      new HtmlWebpackPlugin({
          template: 'html?interpolate&attrs=img:data-src!./src/index.htm'
      })
  ]
};
