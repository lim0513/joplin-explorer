const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
  const isProduction = env && env.production;

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index.ts',
    target: 'node',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      alias: {
        api: path.resolve(__dirname, 'api'),
      },
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'publish'),
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/manifest.json', to: '.' },
          { from: 'src/webview', to: 'webview', noErrorOnMissing: true },
        ],
      }),
    ],
    externals: {
      api: 'commonjs api',
    },
    devtool: isProduction ? false : 'source-map',
  };
};
