const fs = require('fs');
const path = require('path');
const { app } = require('deskgap');

const MAX_RECENT_FILES = 10;

let recentFileService = {};
recentFileService.recentFiles = [];

recentFileService.initialize = () => {
  this.PATH_TO_RECENT_FILES = path.join(app.getPath('userData'), 'recent-files.json');

  if (fs.existsSync(this.PATH_TO_RECENT_FILES)) {
    recentFileService.recentFiles = require(this.PATH_TO_RECENT_FILES);
    delete require.cache[require.resolve(this.PATH_TO_RECENT_FILES)]
  }
  else {
    recentFileService.recentFiles = [];
  }
};

recentFileService.addFile = (filePath, type) => {
  const indexInRecents = recentFileService.recentFiles.findIndex((file) => {
    return file.path === filePath;
  });

  if (indexInRecents >= 0) {
    recentFileService.recentFiles[indexInRecents].time = Date.now();
  }
  else {
    recentFileService.recentFiles.push({
      'path': filePath,
      'type': type,
      'time': Date.now()
    });

    if (recentFileService.recentFiles.length > MAX_RECENT_FILES) {
      recentFileService.recentFiles = recentFileService.getRecentFiles().slice(0, MAX_RECENT_FILES);
    }
  }

  recentFileService._writeToRecentFilesStore(recentFileService.recentFiles);
};

recentFileService.removeFile = (filePath) => {
  const indexInRecents = recentFileService.recentFiles.findIndex((file) => {
    return file.path === filePath;
  });

  if (indexInRecents >= 0) {
    recentFileService.recentFiles.splice(indexInRecents, 1);
    recentFileService._writeToRecentFilesStore(recentFileService.recentFiles);
  }
};

recentFileService.getRecentFiles = () => {
  return recentFileService.recentFiles.sort((a, b) => { return b.time - a.time; });
};

recentFileService._writeToRecentFilesStore = (data) => {
  fs.writeFile(this.PATH_TO_RECENT_FILES, JSON.stringify(data), function (err) {
    if (err) {
      console.log(err);
    }
  });
};

module.exports = recentFileService;