import path from "path";
import { fileURLToPath } from "url";

import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  mode: "development",
  devtool: "inline-source-map",
  entry: {
    background: {
      import: "./src/background/background.js",
      chunkLoading: `import-scripts`,
    },
    popup: "./src/ui/popup/popup.js",
    content: "./src/content/content.js",
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/ui/popup/popup.html",
      filename: "popup.html",
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "public",
          to: ".", // Copies to build folder
        },
        {
          from: "src/ui/popup/popup.css",
          to: "popup.css",
        },
      ],
    }),
  ],
};

export default config;
