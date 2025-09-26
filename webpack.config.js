const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  optimization: {minimize: false},
  devtool: "cheap-module-source-map",
  entry: {
    background: "./src/background/background.js",
    content: "./src/content/content.js",
    popup: "./src/ui/popup/popup.js",
    settings: "./src/ui/settings/settings.js",
    colours_labels: "./src/ui/settings/colours_labels.js",
    content_types: "./src/ui/settings/content_types.js",
    page_overview: "./src/ui/settings/page_overview.js",
    result_style: "./src/ui/settings/result_style.js",
    site_control: "./src/ui/settings/site_control.js",
    speed_accuracy: "./src/ui/settings/speed_accuracy.js",
    threshold: "./src/ui/settings/threshold.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "extension"),
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/ui", to: "ui", globOptions: { ignore: ["**/*.js"] } },
        { from: "src/icons", to: "icons" },
        { from: "src/manifest.json", to: "manifest.json" },
      ],
    }),
  ],
  resolve: { fallback: { fs: false } }
};