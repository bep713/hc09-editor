const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const sinon = require('sinon');
const { expect } = require('chai');
const proxyquire = require('proxyquire');

const importTestWb = xlsx.readFile(path.join(__dirname, '../data/db/import-test.csv'));
const importTestSheetToJsonResponse = xlsx.utils.sheet_to_json(importTestWb.Sheets[importTestWb.SheetNames[0]], {
    'raw': false
});

let xlsxMock = {
    '_import': '',
    'utils': {
        'book_new': sinon.spy(() => { return true; }),
        'json_to_sheet': sinon.spy(() => { return true; }),
        'book_append_sheet': sinon.spy(() => { return true; }),
        'sheet_to_json': sinon.spy(() => {
            if (this._import === 'C:/fakepath/import-test') {
                return importTestSheetToJsonResponse;
            }
            else {
                return [{
                    'RLSP': 1
                }]; 
            }
        })
    },
    'readFile': sinon.spy((importLocation) => { 
        this._import = importLocation;

        return {
            'Sheets': {
                'test': true
            },
            'SheetNames': ['test']
        };
    }),
    'writeFile': sinon.spy(() => { return true; })
};

let dbEditorService = proxyquire('../../src/server/editors/db-editor-service', {
    'xlsx': xlsxMock
});

describe('db editor service unit tests', () => {
    before(async () => {
        await dbEditorService.openFile(path.join(__dirname, '../data/db/test.db'));
    });

    beforeEach(() => {
        xlsxMock.utils.book_new.resetHistory();
        xlsxMock.utils.json_to_sheet.resetHistory();
        xlsxMock.utils.book_append_sheet.resetHistory();
        xlsxMock.utils.sheet_to_json.resetHistory();
        xlsxMock.writeFile.resetHistory();
        xlsxMock.readFile.resetHistory();
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

        
        describe('sort', () => {
            it('will read the entire table even if a record count is supplied (needed for sorting/filtering)', async () => {
                await dbEditorService.getTableData('TEAM', {
                    'recordCount': 5,
                    'startIndex': 5
                });
    
                expect(dbEditorService.activeDbHelper.file['TEAM'].records.length).to.equal(36);
            });
            
            it('returns expected amount of records with sort parameters passed in', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'sort': {
                        'field': 'SID1',
                        'order': 'asc'
                    }
                });

                expect(sortedData.totalRecords).to.equal(36);
                expect(sortedData.filteredRecords.length).to.equal(36);
            });

            it('can sort by a field ascending', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'sort': {
                        'field': 'SID1',
                        'order': 'asc'
                    }
                });

                expect(sortedData.filteredRecords[0].SID1).to.equal(35);
                expect(sortedData.filteredRecords[1].SID1).to.equal(46);
                expect(sortedData.filteredRecords[2].SID1).to.equal(127);
            });

            it('can sort by a field descending', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'sort': {
                        'field': 'SID1',
                        'order': 'desc'
                    }
                });

                expect(sortedData.filteredRecords[0].SID1).to.equal(127);
                expect(sortedData.filteredRecords[34].SID1).to.equal(46);
                expect(sortedData.filteredRecords[35].SID1).to.equal(35);
            });

            it('can return unsorted results after sorting', async () => {
                await dbEditorService.getTableData('TEAM', {
                    'sort': {
                        'field': 'SID1',
                        'order': 'asc'
                    }
                });

                const unsortedResults = await dbEditorService.getTableData('TEAM');

                expect(unsortedResults.filteredRecords[0].SID1).to.equal(127);
                expect(unsortedResults.filteredRecords[1].SID1).to.equal(127);
                expect(unsortedResults.filteredRecords[2].SID1).to.equal(127);
                expect(unsortedResults.filteredRecords[6].SID1).to.equal(46);
            });

            it('can return partial results with sorting', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'recordCount': 5,
                    'sort': {
                        'field': 'SID1',
                        'order': 'asc'
                    }
                });

                expect(sortedData.filteredRecords.length).to.equal(5);
                expect(sortedData.filteredRecords[0].SID1).to.equal(35);
                expect(sortedData.filteredRecords[1].SID1).to.equal(46);
                expect(sortedData.filteredRecords[2].SID1).to.equal(127);
            });

            it('can specify a start index with sorting', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'startIndex': 10,
                    'sort': {
                        'field': 'SID1',
                        'order': 'asc'
                    }
                });

                expect(sortedData.filteredRecords.length).to.equal(26);
                expect(sortedData.filteredRecords[0].SID1).to.equal(127);
                expect(sortedData.filteredRecords[1].SID1).to.equal(127);
            });

            it('can specify a start index and record count with sorting', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'startIndex': 10,
                    'recordCount': 5,
                    'sort': {
                        'field': 'SID1',
                        'order': 'asc'
                    }
                });

                expect(sortedData.filteredRecords.length).to.equal(5);
                expect(sortedData.filteredRecords[0].SID1).to.equal(127);
                expect(sortedData.filteredRecords[1].SID1).to.equal(127);
            });

            it('can sort text fields desc', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'sort': {
                        'field': 'TDNA',
                        'order': 'desc'
                    }
                });

                expect(sortedData.filteredRecords[0].TDNA).to.equal('Vikings');
                expect(sortedData.filteredRecords[1].TDNA).to.equal('Titans');
                expect(sortedData.filteredRecords[2].TDNA).to.equal('Texans');
            });

            it('can sort text fields asc', async () => {
                const sortedData = await dbEditorService.getTableData('TEAM', {
                    'sort': {
                        'field': 'TLNA',
                        'order': 'asc'
                    }
                });

                expect(sortedData.filteredRecords[0].TLNA).to.equal('Arizona');
                expect(sortedData.filteredRecords[1].TLNA).to.equal('Atlanta');
                expect(sortedData.filteredRecords[2].TLNA).to.equal('Baltimore');
            });
        });

        describe('filtering', () => {
            describe('text filters', () => {
                it('equals', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TDNA': { operator: 'and', constraints: [{value: 'Bears', matchMode: 'equals'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(1);
                    expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                });
    
                it('contains', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TDNA': { operator: 'and', constraints: [{value: 'Bear', matchMode: 'contains'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(1);
                    expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                });
    
                it('starts with', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TDNA': { operator: 'and', constraints: [{value: 'Bea', matchMode: 'startsWith'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(1);
                    expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                });
    
                it('ends with', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TDNA': { operator: 'and', constraints: [{value: 'ars', matchMode: 'endsWith'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(2);
                    expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                    expect(data.filteredRecords[1].TDNA).to.equal('Jaguars');
                });
    
                it('not equals', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TDNA': { operator: 'and', constraints: [{value: 'Bears', matchMode: 'notEquals'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(35);
                });
    
                it('not contains', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TDNA': { operator: 'and', constraints: [{value: 'Bea', matchMode: 'notContains'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(35);
                });
            });

            describe('number filters', () => {
                it('equals', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TEZ2': { operator: 'and', constraints: [{value: '1', matchMode: 'equals'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(1);
                    expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                });

                it('not equals', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TEZ2': { operator: 'and', constraints: [{value: '1', matchMode: 'notEquals'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(35);
                });

                it('less than', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TEZ1': { operator: 'and', constraints: [{value: '1', matchMode: 'lt'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(1);
                    expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                });

                it('less than or equal to', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TEZ1': { operator: 'and', constraints: [{value: '1', matchMode: 'lte'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(2);
                    expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                    expect(data.filteredRecords[1].TDNA).to.equal('Bengals');
                });

                it('greater than', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TEZ1': { operator: 'and', constraints: [{value: '31', matchMode: 'gt'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(4);
                    expect(data.filteredRecords[0].TDNA).to.equal('HOF Unlocked');
                    expect(data.filteredRecords[1].TDNA).to.equal('Free Agents');
                    expect(data.filteredRecords[2].TDNA).to.equal('Draft');
                    expect(data.filteredRecords[3].TDNA).to.equal('Hall Of Fame');
                });

                it('greater than or equal to', async () => {
                    const data = await dbEditorService.getTableData('TEAM', {
                        'filter': {
                            'TEZ1': { operator: 'and', constraints: [{value: '31', matchMode: 'gte'}] }
                        }
                    });
    
                    expect(data.filteredRecords.length).to.equal(5);
                    expect(data.filteredRecords[0].TDNA).to.equal('Texans');
                    expect(data.filteredRecords[1].TDNA).to.equal('HOF Unlocked');
                    expect(data.filteredRecords[2].TDNA).to.equal('Free Agents');
                    expect(data.filteredRecords[3].TDNA).to.equal('Draft');
                    expect(data.filteredRecords[4].TDNA).to.equal('Hall Of Fame');
                });
            });

            it('filters are not case sensitive', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'TDNA': { operator: 'and', constraints: [{value: 'bears', matchMode: 'equals'}] }
                    }
                });

                expect(data.filteredRecords.length).to.equal(1);
                expect(data.filteredRecords[0].TDNA).to.equal('Bears');
            });

            it('total record count is the same as filtered record count', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'TDNA': { operator: 'and', constraints: [{value: 'bears', matchMode: 'equals'}] }
                    }
                });

                expect(data.totalRecords).to.equal(1);
                expect(data.filteredRecords[0].TDNA).to.equal('Bears');
            });

            it('supports multiple filters on a single field (and)', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'TDNA': { operator: 'and', constraints: [{value: 'Jag', matchMode: 'startsWith'}, {value: 'ars', matchMode: 'endsWith'}] }
                    }
                });

                expect(data.filteredRecords.length).to.equal(1);
                expect(data.filteredRecords[0].TDNA).to.equal('Jaguars');
            });

            it('supports multiple filters on a single field (or)', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'TDNA': { operator: 'or', constraints: [{value: 'ars', matchMode: 'endsWith'}, {value: 'Browns', matchMode: 'equals'}] }
                    }
                });

                expect(data.filteredRecords.length).to.equal(3);
                expect(data.filteredRecords[0].TDNA).to.equal('Bears');
                expect(data.filteredRecords[1].TDNA).to.equal('Jaguars');
                expect(data.filteredRecords[2].TDNA).to.equal('Browns');
            });

            it('supports multiple column filters', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'TDNA': { operator: 'or', constraints: [{value: 'ars', matchMode: 'endsWith'}, {value: 'Browns', matchMode: 'equals'}] },
                        'TLNA': { operator: 'or', constraints: [{value: 'Cleveland', matchMode: 'equals'}] }
                    }
                });

                expect(data.filteredRecords.length).to.equal(1);
                expect(data.filteredRecords[0].TDNA).to.equal('Browns');
            });

            it('supports multiple column filters - empty case 1', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'TDNA': { operator: 'or', constraints: [{value: 'ars', matchMode: 'endsWith'}, {value: 'Browns', matchMode: 'equals'}] },
                        'TLNA': { operator: 'or', constraints: [{value: 'Atlanta', matchMode: 'equals'}] }
                    }
                });

                expect(data.filteredRecords.length).to.equal(0);
            });

            it('supports multiple column filters - empty case 2', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'TDNA': { operator: 'or', constraints: [{value: 'ars', matchMode: 'endsWith'}, {value: 'FakeTeam', matchMode: 'equals'}] },
                        'TLNA': { operator: 'or', constraints: [{value: 'Cleveland', matchMode: 'equals'}] }
                    }
                });

                expect(data.filteredRecords.length).to.equal(0);
            });

            it('ignores column names that do not exist', async () => {
                const data = await dbEditorService.getTableData('TEAM', {
                    'filter': {
                        'FAKE': { operator: 'or', constraints: [{value: 'ars', matchMode: 'endsWith'}, {value: 'FakeTeam', matchMode: 'equals'}] },
                    }
                });

                expect(data.filteredRecords.length).to.equal(0);
            });
        });
    });

    describe('can export table data', () => {
        it('function exists', () => {
            expect(dbEditorService.exportTable).to.exist;
        });

        it('attempts to write a file to the expected path', () => {
            dbEditorService.exportTable('TEAM', {
                'exportLocation': 'C:/fakepath'
            });

            expect(xlsxMock.writeFile.callCount).to.equal(1);
            expect(xlsxMock.writeFile.firstCall.args[1]).to.equal('C:/fakepath');
        });

        it('transforms data to expected result', async () => {
            await dbEditorService.getTableData('RDBS');

            dbEditorService.exportTable('RDBS', {
                'exportLocation': 'C:/fakepath'
            });

            expect(xlsxMock.utils.json_to_sheet.callCount).to.equal(1);
            expect(xlsxMock.utils.json_to_sheet.firstCall.args[0].length).to.equal(2);
            expect(xlsxMock.utils.json_to_sheet.firstCall.args[0][0]).to.eql(['RLSP']);
            expect(xlsxMock.utils.json_to_sheet.firstCall.args[0][1]).to.eql([0]);
        });
    });

    describe('can import data', () => {
        it('function exists', () => {
            expect(dbEditorService.importTable).to.exist;
        });

        it('reads the file at the expected file path', async () => {
            await dbEditorService.importTable('RDBS', {
                'importLocation': 'C:/fakepath'
            });

            expect(xlsxMock.readFile.callCount).to.equal(1);
            expect(xlsxMock.readFile.firstCall.args[0]).to.equal('C:/fakepath');
        });

        it('overwrites the table data as expected', async () => {
            await dbEditorService.getTableData('RDBS');

            await dbEditorService.importTable('RDBS', {
                'importLocation': 'C:/fakepath'
            });

            const newData = await dbEditorService.getTableData('RDBS');

            expect(newData.filteredRecords[0].RLSP).to.equal(1);
        });

        it('overwrites table data - performance test', async function() {
            this.timeout(60000);

            await dbEditorService.getTableData('CSKL');

            await dbEditorService.importTable('CSKL', {
                'importLocation': 'C:/fakepath/import-test'
            });

            const newData = await dbEditorService.getTableData('CSKL');
            
            expect(newData.filteredRecords[1].SKID).to.equal(5);
        });
    });
});