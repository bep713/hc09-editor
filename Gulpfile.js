const path = require('path');
const gulp = require('gulp');
const deskgap = require('deskgap/run');

function compileSass(cb) {
    console.log('COMPILE SASS');
    cb();
};

function reload(cb) {
    console.log('HOT RELOAD');
    cb();
};

function runApp(cb) {
    gulp.watch('src/client/**/*.sass', gulp.series(compileSass, reload));
    gulp.watch(['src/client/**/*.js', 'src/client/**/*.html'], reload);

    const distPath = process.env.DESKGAP_DIST_PATH || path.join(__dirname, 'dist');
    const proc = deskgap(distPath, '.', process.argv.slice(3));

    console.log(proc);
};

exports.default = runApp;