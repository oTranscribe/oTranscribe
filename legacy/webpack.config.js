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
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
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
          loader: ExtractTextPlugin.extract(['css-loader','sass-loader'])
          
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
          template: 'html-loader?interpolate&attrs=img:data-src!./src/index.htm'
      })
  ]
};
