const regeneratorRuntime = require('regenerator-runtime');
const { render, fireEvent, cleanup } = require('@testing-library/vue');
const DBEditorHome = require('../../src/client/main/views/DBEditorHome.vue').default;

describe('DB Editor Home', async () => {
    afterEach(() => {
        cleanup();
    });

    describe('navigation', async () => {
        it('Back to home', async () => {
            const { getByText } = render(DBEditorHome);
            getByText('Back to Home');
        });

        it('open DB file', async () => {
            const { getByText } = render(DBEditorHome);
            getByText('Open DB file');
        });
    });

    describe('opening a DB file', () => {
        it('can open a DB file', async () => {
            const { getByText } = render(DBEditorHome);
            const button = getByText('Open DB file');
            
            await fireEvent.click(button);
        });
    });

    describe('recent files', () => {
        it('recent files header', () => {
            const { getByText } = render(DBEditorHome);
            getByText('Recently opened DB items');
        });
    });
});