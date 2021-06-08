const fs = require('fs');
const path = require('path');
const api = require('./server/api');
const log = require('./util/logger');
const menu = require('./server/menu');
const { app, BrowserWindow } = require('deskgap');

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
    require('./util/livereload')(path.join(__dirname, './client'));
}

let mainWindow;

const makeUserDataFolderPromise = new Promise((resolve, reject) => {
    fs.promises.readdir(app.getPath('userData'))
        .then(() => {
            // folder exists
            resolve();
        })
        .catch((err) => {
            // folder does not exist, create it
            fs.promises.mkdir(app.getPath('userData'))
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    log.error(err);
                    reject(err);
                })
        })
});

app.on('window-all-closed', (event) => {
    app.quit();
});

app.once('ready', () => {
    mainWindow = new BrowserWindow({
        height: 600,
        width: 1100,
        icon: path.join(__dirname, './client/img/icon.ico'),
        menu: menu
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    api.initializeListeners(mainWindow);

    Promise.all([makeUserDataFolderPromise])
        .then(() => {
            mainWindow.loadFile(path.join(__dirname, './client/main/dist/index.html'));
        })
        .catch((err) => {
            log.error(err);
        });
});