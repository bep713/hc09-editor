const path = require('path');
const dbQueryHelper = require('../../src/server/helpers/db-query-helper');
const dbEditorService = require('../../src/server/editors/db-editor-service');
const { expect } = require('chai');

const DB_FILE_PATH = path.join(__dirname, '../data/db/BLUS30128-CAREER-TEST/USR-DATA');

describe('db query helper unit tests', () => {
    before(async () => {
        await dbEditorService.openFile(DB_FILE_PATH);
    });

    it('can initialize', () => {
        dbQueryHelper.initialize(dbEditorService);

        expect(dbQueryHelper.dbEditorService).to.eql(dbEditorService);
    });

    it('can get all teams', async () => {
        const teamData = await dbQueryHelper.getAllTeams();
        expect(teamData.length).to.equal(38);
        expect(teamData[0]).to.eql({
            'TGID': 1,
            'cityName': 'Chicago',
            'nickName': 'Bears',
            'colors': {
                'r': 21,
                'b': 148,
                'g': 57
            }
        });

        expect(teamData[15]).to.eql({
            'TGID': 16,
            'cityName': 'New York',
            'nickName': 'Giants',
            'colors': {
                'r': 0,
                'b': 163,
                'g': 76
            }
        });
    });

    it('can get all coaches', async () => {
        const coachData = await dbQueryHelper.getAllCoaches();
        expect(coachData.length).to.equal(352);
        expect(coachData[0]).to.eql({
            'firstName': 'Lovie',
            'lastName': 'Smith',
            'position': {
                'long': 'Head coach',
                'short': 'HC'
            },
            'team': {
                'TGID': 1,
                'cityName': 'Chicago',
                'nickName': 'Bears',
                'colors': {
                    'r': 21,
                    'b': 148,
                    'g': 57
                }
            },
            'portraitId': 559,
            'overall': 48
        })
    });
});