class EventResponse {
    constructor(success) {
        this._success = success;
        this._errorMessage = null;
    };

    set success(success) {
        this._success = success;
    };

    get success() {
        return this._success;
    };

    set errorMessage(message) {
        this._errorMessage = message;
    };

    get errorMessage() {
        return this._errorMessage;
    }
};

module.exports = EventResponse;