const { CheckerPlugin } = require("awesome-typescript-loader");

module.exports = {
  mode: "development",
  entry: "./src/index.ts",
  output: {
    path: __dirname + "/dist",
    filename: "[name].js"
  },
  devtool: "eval-source-map",
  devServer: {
    contentBase: "./src"
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      },
      {
        test: /\.tsx?$/,
        loader: "awesome-typescript-loader"
      }
    ]
  },
  plugins: [new CheckerPlugin()]
};
