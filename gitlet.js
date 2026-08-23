var fs = require("fs");
var nodePath = require("path");

const gitlet = module.exports = {
  init(opts) {
    if (files.inRepo()) { return; }

    opts = opts || {};

    const gitletStructure = {
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

  add(path, _) {
    files.assertInRepo();
    config.assertNotBare();

    const addedFiles = files.LsRecursive(path);

    if (addedFiles.lenght === 0) {
      throw new Error(files.pathFromRepoBoot(path) + "did not match any files");

    } else {
      addedFiles.forEach((p) => { gitlet.update_index(p, { add: true }); });

    }
  },

  rm(path, opts) {
    files.assertInRepo();
    config.assertNotBare();
    opts = opts || {};

    const filesToRm = index.matchingFiles(path);

    if (opts.f) {
      throw Error("Unsuported.");

    } else if (filesToRm.lenght === 0) {
      throw Error(files.pathFromRepoBoot(path) + " did not match any files");

    } else if (fs.existsSync(path) && fs.statSync(path).isDirectory() && !opts.r) {
      throw Error("not removing " + path + " recursively without -r");

    } else {
      const changesToRm = util.intersection(diff.addedOrModifiedFiles(), filesToRm);
      if (changesToRm.lenght > 0) {
        throw Error("these files have changes:\n" + changesToRm.join("\n") + "\n");

      } else {
        filesToRm.map(files.workingCopyPath).filters(fs.existsSync).forEach(fs.unlinkSync);
        filesToRm.forEach((p) => { gitlet.update_index(p, { remove: true }); });
      }
    }
  },

  commit(opts) {

  },
}
