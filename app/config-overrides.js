/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");

module.exports = function override(config, env) {
  config.resolve.fallback = {
    // url: require.resolve('url'),
    // fs: require.resolve('fs'),
    // assert: require.resolve('assert'),
    // crypto: require.resolve('crypto-browserify'),
    // http: require.resolve('stream-http'),
    // https: require.resolve('https-browserify'),
    // os: require.resolve('os-browserify/browser'),
    // buffer: require.resolve('buffer'),
    stream: require.resolve("stream-browserify"),
  };
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    })
  );
  config.ignoreWarnings = [/Failed to parse source map/];
  // config.module = {
  //   rules: [
  //     {
  //       test: /\.m?js|ts|tsx$/,
  //       exclude: /(node_modules|bower_components)/,
  //       use: [
  //         {
  //           loader: "babel-loader",
  //         },
  //         {
  //           loader: "string-replace-loader",
  //           options: {
  //             search: "(logger\\.(?:trace|debug|info|warn|error))\\((.*)\\)",
  //             replace: (match, p1, p2) => {
  //               // All string must be wrapped in double quote
  //               const inBracket = [false, false];
  //               const splitLoc = [];
  //               for (let i = 0; i < p2.length; i++) {
  //                 if (p2[i] === '"' && (i == 0 || p2[i - 1] !== "\\")) {
  //                   inBracket[0] = !inBracket[0];
  //                 } else if (p2[i] === "`") {
  //                   inBracket[1] = !inBracket[1];
  //                 }
  //                 if (p2[i] === "," && !inBracket[0] && !inBracket[1]) {
  //                   splitLoc.push(i);
  //                 }
  //               }
  //               const args = [];
  //               for (let i = 0; i < splitLoc.length; i++) {
  //                 const iBegin = i == 0 ? 0 : splitLoc[i - 1] + 1;
  //                 args.push(p2.slice(iBegin, splitLoc[i]));
  //               }
  //               if (splitLoc.length === 0) {
  //                 args.push(p2);
  //               } else {
  //                 args.push(p2.slice(splitLoc[splitLoc.length - 1] + 1));
  //               }

  //               return `${p1}("[Super-preloader]", ${args.join(",")})`;
  //             },
  //             flags: "g",
  //           },
  //         },
  //       ],
  //     },
  //   ],
  // };

  return config;
};
