const { CheckerPlugin } = require("awesome-typescript-loader");

module.exports = {
  mode: "development",
  entry: "./src/main.ts",
  output: {
    path: __dirname + "/dist",
    filename: "[name].js"
  },
  devtool: "source-map",
  devServer: {
    contentBase: "./src/html",
    watchContentBase: true
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "awesome-typescript-loader"
      }
    ]
  },
  plugins: [new CheckerPlugin()]
};
