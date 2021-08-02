const sinon = require('sinon');
const { expect } = require('chai');

window = {
    deskgap: {
        messageUI: {
            on: sinon.spy(() => {}),
            removeListener: sinon.spy(() => {})
        }
    }
}

const MessageUiHelper = require('../../src/client/util/message-ui-helper');

describe('message ui helper unit tests', () => {
    beforeEach(() => {
        window.deskgap.messageUI.on.resetHistory();
        window.deskgap.messageUI.removeListener.resetHistory();
    });

    it('can register an event listener', () => {
        let h = new MessageUiHelper();

        function onTest () {
            console.log('test');
        };

        h.on('test', onTest);

        expect(h.listeners['test']).to.eql([onTest]);
        expect(window.deskgap.messageUI.on.callCount).to.eql(1);
        expect(window.deskgap.messageUI.on.firstCall.args).to.eql(['test', onTest]);
    });

    it('can register many event listeners', () => {
        let h = new MessageUiHelper();

        function onTest () {
            console.log('test');
        };

        h.on('test', onTest);

        function onTest2() {
            console.log('test2');
        };

        h.on('test', onTest2);

        expect(h.listeners['test']).to.eql([onTest, onTest2]);
        expect(window.deskgap.messageUI.on.callCount).to.eql(2);
        expect(window.deskgap.messageUI.on.firstCall.args).to.eql(['test', onTest]);
        expect(window.deskgap.messageUI.on.secondCall.args).to.eql(['test', onTest2]);
    });

    it('can register many events', () => {
        let h = new MessageUiHelper();

        function onTest () {
            console.log('test');
        };

        h.on('test', onTest);

        function onTest2() {
            console.log('test2');
        };

        h.on('test2', onTest2);

        expect(h.listeners['test']).to.eql([onTest]);
        expect(h.listeners['test2']).to.eql([onTest2]);

        expect(window.deskgap.messageUI.on.callCount).to.eql(2);
        expect(window.deskgap.messageUI.on.firstCall.args).to.eql(['test', onTest]);
        expect(window.deskgap.messageUI.on.secondCall.args).to.eql(['test2', onTest2]);
    });

    it('can remove all events', () => {
        let h = new MessageUiHelper();

        function onTest () {
            console.log('test');
        };

        h.on('test', onTest);

        function onTest2() {
            console.log('test2');
        };

        h.on('test2', onTest2);

        h.removeAll();
        expect(h.listeners).to.eql({});
        expect(window.deskgap.messageUI.removeListener.callCount).to.eql(2);
        expect(window.deskgap.messageUI.removeListener.firstCall.args).to.eql(['test', onTest]);
        expect(window.deskgap.messageUI.removeListener.secondCall.args).to.eql(['test2', onTest2]);
    });
});