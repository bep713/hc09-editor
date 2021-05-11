export default class ASTEditorTree {
    constructor() {
        this._rootFiles = [];
    };

    get rootFiles() {
        return this._rootFiles;
    };

    set rootFiles(files) {
        this._rootFiles = files;
    };

    addRootFile(file) {
        this._rootFiles.push(file);
    };
};