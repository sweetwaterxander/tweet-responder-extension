const Dotenv = require('dotenv-webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './background.js',
    popup: './popup.js',
    content: './content.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      "crypto": false
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new Dotenv(),
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "popup.html", to: "popup.html" },
        { from: "styles.css", to: "styles.css" },
        { from: 'node_modules/pdfjs-dist/build/pdf.min.mjs', to: 'pdf.min.js' },
        { from: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs', to: 'pdf.worker.min.js' },
      ],
    }),
  ]
};