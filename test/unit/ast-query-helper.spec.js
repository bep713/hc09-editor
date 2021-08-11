const path = require('path');
const astQueryHelper = require('../../src/server/helpers/ast-query-helper');
const astEditorService = require('../../src/server/editors/ast-editor-service');
const { expect } = require('chai');

const AST_ROOT_PATH = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]'

describe('ast query helper unit tests', () => {
    before(async function () {
        this.timeout(10000);
        await astQueryHelper.initialize(astEditorService, AST_ROOT_PATH);
    });

    it('can initialize and read root path', async () => {
        expect(astQueryHelper.astEditorService).to.eql(astEditorService);
        expect(Object.keys(astQueryHelper.astRoots).length).to.equal(5);
        expect(astQueryHelper.ast.fe2ig).to.not.be.undefined;
        expect(astQueryHelper.astsRead).to.be.true;
    });

    it('can retrieve all coach portraits', async function () {
        this.timeout(10000);
        const portraits = await astQueryHelper.getCoachPortraits();
        expect(portraits.length).to.equal(883);
        expect(portraits[0]).to.eql({
            index: 846,
            id: 0,
            preview: "data:image/webp;base64,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"
        });
    });

    it('waits for initialization to complete before running coach portraits', async function () {
        this.timeout(15000);
        astQueryHelper.astsRead = false;
        astQueryHelper.astRoots = null;
        astQueryHelper.initialize(astEditorService, AST_ROOT_PATH);
        const portraits = await astQueryHelper.getCoachPortraits();
        expect(portraits.length).to.equal(883);
    });
});