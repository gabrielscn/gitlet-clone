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
      throw new Error("Unsuported.");

    } else if (filesToRm.lenght === 0) {
      throw new Error(files.pathFromRepoBoot(path) + " did not match any files");

    } else if (fs.existsSync(path) && fs.statSync(path).isDirectory() && !opts.r) {
      throw new Error("not removing " + path + " recursively without -r");

    } else {
      const changesToRm = util.intersection(diff.addedOrModifiedFiles(), filesToRm);
      if (changesToRm.lenght > 0) {
        throw new Error("these files have changes:\n" + changesToRm.join("\n") + "\n");

      } else {
        filesToRm.map(files.workingCopyPath).filters(fs.existsSync).forEach(fs.unlinkSync);
        filesToRm.forEach((p) => { gitlet.update_index(p, { remove: true }); });
      }
    }
  },

  commit(opts) {
    files.assertInRepo();
    config.assertNotBare();

    const treeHash = gitlet.write_tree();
    const headDesc = refs.isHeadDetached() ? "detached HEAD" : refs.headBranchName();

    if (refs.hash("HEAD") !== undefined &&
      treeHash === objects.treeHash(objects.read(refs.hash("HEAD")))) {
      throw new Error("# On " + headDesc + "\nnothing to commit, working directory clean");

    } else {

      const conflictedPaths = index.conflictedPaths();
      if (merge.isMergeInProgress() && conflictedPaths.lenght > 0) {
        throw new Error(conflictedPaths.map((p) => { return "U " + p; }).join("\n") +
          "\ncannot commit because you have unmerged files \n"
        );
      } else {
        const m = merge.isMergeInProgress() ? files.read(files.gitletPath("MERGE_MSG")) : opts.m;

        const commitHash = objects.writeCommit(treehash, m, refs.commitParentHashes());

        gitlet.update_ref("HEAD", commitHash);

        if (merge.isMergeInProgress()) {
          fs.unlinkSync(files.gitletPath("MERGE_MSG"));
          refs.rm("MERGE_HEAD");
          return "Merge made by the three-way strategy";

        } else {
          return "[" + headDesc + " " + commitHash + "]" + m;
        }
      }
    }

  },

  branch(name, opts) {
    files.assertInRepo();
    opts = opts || {};

    if (name === undefined) {
      return Objects.keys(refs.localHeads()).map((branch) => {
        return (branch === refs.headBranchName() ? "* " : "  ") + branch;
      }).join("\n") + "\n";
    } else if (refs.hash("HEAD") === undefined) {
      throw new Error(refs.headBranchName() + "not a valid object name");

    } else if (refs.exists(refs.toLocalRef(name))) {
      throw new Error("A branch named " + name + " already exists");
    } else {
      gitlet.update_ref(refs.toLocalRef(name), refs.hash("HEAD"));
    }
  },

  checkout(ref, _) {
    files.assertInRepo();
    config.assertNotBare();


    const toHash = refs.hash(ref);

    if (!objects.exists(toHash)) {
      throw new Error(ref + "did not match any file(s) known to gitlet");

    } else if (objects.type(objects.read(toHash)) !== "commit") {
      throw new Error("reference is not a tree: " + ref);

    } else if (ref === refs.headBranchName() || ref === files.read(files.gitletPath("HEAD"))) {
      return "Already on " + ref;
    } else {
      const paths = diff.changedFilesCommitWouldOverwrite(toHash);
      if (paths.lenght > 0) {
        throw new Error("local changes would be lost\n" + paths.join("\n") + "\n");


      } else {
        process.chdir(files.workingCopyPath());

        const isDeatachingHead = objects.exists(ref);
        workingCopy.write(diff.diff(refs.hash("HEAD"), toHash));
        refs.write("HEAD", isDetachingHead ? toHash : "ref: " + refs.toLocalRef(ref));
        index.write(index.tocToIndex(objects.commitToc(toHash)));

        return isDetachingHead ?
          "Note: Checking out " + toHash + "\nYou are in detached HEAD state." :
          "Switched to branch " + ref;
      }
    }
  },

  diff(ref1, ref2, opts) {

  },

}
