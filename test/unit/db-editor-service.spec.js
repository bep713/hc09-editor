const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
let dbEditorService = require('../../src/server/editors/db-editor-service');

describe('db editor service unit tests', () => {
    before(async () => {
        await dbEditorService.openFile(path.join(__dirname, '../data/db/test.db'));
    });

    describe('can open a DB file', () => {
        it('function exists', () => {
            expect(dbEditorService.openFile).to.exist;
        });

        it('active helper is set on open', async () => {
            dbEditorService.activeDbHelper = null;
            await dbEditorService.openFile(path.join(__dirname, '../data/db/test.db'));
            expect(dbEditorService.activeDbHelper).to.not.be.null;
        });
    });

    describe('can return a list of tables in the file', () => {
        it('function exists', () => {
            expect(dbEditorService.getTables).to.exist;
        });

        it('returns expected result', () => {
            const result = dbEditorService.getTables();
            expect(result).to.eql(['CSKL', 'COCH', 'RDBS', 'DCHT', 'DRPP', 'GMSK', 'GMVW', 'INJY', 'OWNR', 'PERV', 'PLAY', 'SCHD', 'TPHL', 'TPHS', 'TEAM', 'TRVW']);
        });
    });

    describe('can retrieve table data', () => {
        it('function exists', () => {
            expect(dbEditorService.getTableData).to.exist;
        });

        it('can retrieve all records', async () => {
            const records = (await dbEditorService.getTableData('TEAM')).filteredRecords;
            expect(records.length).to.equal(36);

            expect(records[0].SID1).to.eql(127);
            expect(records[0].TRV1).to.eql(20);
            expect(records[0].TEZ1).to.eql(0);
            expect(records[0].TRV2).to.eql(31);
            expect(records[0].TEZ2).to.eql(1);
            expect(records[0].TRV3).to.eql(19);
            expect(records[0].TDNA).to.eql('Bears');
            expect(records[0].TLNA).to.eql('Chicago');
            expect(records[0].TSNA).to.eql('CHI');

            expect(records[27].SID1).to.eql(127);
            expect(records[27].TRV1).to.eql(24);
            expect(records[27].TEZ1).to.eql(27);
            expect(records[27].TRV2).to.eql(9);
            expect(records[27].TEZ2).to.eql(0);
            expect(records[27].TRV3).to.eql(4);
            expect(records[27].TDNA).to.eql('Seahawks');
            expect(records[27].TLNA).to.eql('Seattle');
            expect(records[27].TSNA).to.eql('SEA');
        });

        it('returns records if table has already been loaded', async () => {
            const records = (await dbEditorService.getTableData('TEAM')).filteredRecords;
            expect(records.length).to.equal(36);
        });

        it('can restrict the number of records to return', async () => {
            const originalRecords = (await dbEditorService.getTableData('TEAM')).filteredRecords;

            const records = (await dbEditorService.getTableData('TEAM', {
                'recordCount': 5
            })).filteredRecords;

            expect(records.length).to.equal(5);
            expect(records[0]).to.eql(originalRecords[0]);
        });

        it('can specify a starting index for the results for pagination', async () => {
            const originalRecords = (await dbEditorService.getTableData('TEAM')).filteredRecords;

            const records = (await dbEditorService.getTableData('TEAM', {
                'startIndex': 5
            })).filteredRecords;

            expect(records.length).to.equal(31);
            expect(records[0]).to.eql(originalRecords[5]);
        });

        it('if record count is larger than results, it will return the number of results', async () => {
            const records = (await dbEditorService.getTableData('TEAM', {
                'recordCount': 100
            })).filteredRecords;

            expect(records.length).to.equal(36);
        });

        it('can specify a recordCount and startIndex together', async () => {
            const originalRecords = (await dbEditorService.getTableData('TEAM')).filteredRecords;

            const records = (await dbEditorService.getTableData('TEAM', {
                'recordCount': 5,
                'startIndex': 5
            })).filteredRecords;

            expect(records.length).to.equal(5);
            expect(records[0]).to.eql(originalRecords[5]);
            expect(records[4]).to.eql(originalRecords[9]);
        });

        it('returns the total number of records', async () => {
            const totalRecords = (await dbEditorService.getTableData('TEAM')).totalRecords;
            expect(totalRecords).to.equal(36);
        });

        it('returns expected total number of records with a recordCount', async () => {
            const totalRecords = (await dbEditorService.getTableData('TEAM', {
                'recordCount': 5,
                'startIndex': 5
            })).totalRecords;

            expect(totalRecords).to.equal(36);
        });
    });
});