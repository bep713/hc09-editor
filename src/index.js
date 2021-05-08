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

app.once('ready', () => {
    mainWindow = new BrowserWindow({
        height: 600,
        width: 1100,
        icon: path.join(__dirname, './client/img/icon.ico'),
        menu: menu
    });
    mainWindow.loadFile(path.join(__dirname, './client/main/dist/index.html'));

    api.initializeListeners(mainWindow);
});