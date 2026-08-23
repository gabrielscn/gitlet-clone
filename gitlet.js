var fs = require("fs");
var nodePath = require("path");

var gitlet = module.exports = {
  init: function (opts) {
    if (files.inRepo()) { return; }

    opts = opts || {};

    var gitletStructure = {
      HEAD: "ref: ref/heads/master\n",

      config: config.objToStr({ core: { "": { bare: opts.bare === true } } }),

      objects: {},
      refs: {
        heads: {},
      }
    };

    files.writeFilesFromTree(opts.bare ? gitletStructure : { ".gitlet": gitletStructure },
      process.cwd());
  },

  add: function (path, _) {

  }
}
