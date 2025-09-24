const path = require("path");

module.exports = {
  entry: {
    popup: "./src/ui/popup.js",
    background: "./src/ui/background.js",
    content: "./src/ui/content.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "extension"),
  },
  resolve: { fallback: { fs: false } },
};
