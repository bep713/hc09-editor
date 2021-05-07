class CareerInfo {
    constructor(filePath) {
        this._filePath = filePath;
        this._teamId = null;
        this._teamRgb = null;
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

    set teamData(teamData) {
        this._teamData = teamData;
    };

    get teamData() {
        return this._teamData;
    };
};

module.exports = CareerInfo;