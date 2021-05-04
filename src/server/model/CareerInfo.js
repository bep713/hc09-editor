class CareerInfo {
    constructor(filePath) {
        this._filePath = filePath;
    };

    get filePath() {
        return this._filePath;
    };
    
    set filePath(path) {
        this._filePath = path;
    };

    get teamId() {
        return this._teamId;
    };


    set teamId(id) {
        this._teamId = id;
    };

    toObject() {
        return {
            'filePath': this._filePath,
            'teamId': this._teamId
        };
    };
};

module.exports = CareerInfo;