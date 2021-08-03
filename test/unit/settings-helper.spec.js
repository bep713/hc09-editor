const sinon = require('sinon');
const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

let confMock = sinon.spy(function () {
    return {
        store: {
            testSetting1: '',
            testSetting2: 1
        }
    }
});

let settingsMappingMock = {
    testSetting1: {
        schema: {
            type: 'string',
            default: ''
        },
        uiName: 'Test setting 1',
        uiType: 'file'
    },
    testSetting2: {
        schema: {
            type: 'integer',
            default: 1
        },
        uiName: 'Test setting 2',
        uiType: 'text'
    }
}

const settingsHelper = proxyquire('../../src/server/helpers/settings-helper', {
    'conf': confMock,
    '../data/settingsMapping.json': settingsMappingMock
});

describe('settings helper unit tests', () => {
    it('can initialize with proper params', () => {
        settingsHelper.initialize();

        expect(confMock.callCount).to.equal(1);
        expect(confMock.firstCall.args[0].projectSuffix).to.eql('');
        expect(confMock.firstCall.args[0].schema).to.eql({
            testSetting1: {
                type: 'string',
                default: ''
            },
            testSetting2: {
                type: 'integer',
                default: 1
            }
        });
    });

    it('can retrieve a mapping of the settings with ui names', () => {
        const settings = settingsHelper.getAllSettings();
        expect(settings).to.eql({
            testSetting1: {
                uiName: 'Test setting 1',
                uiType: 'file',
                value: ''
            },
            testSetting2: {
                uiName: 'Test setting 2',
                uiType: 'text',
                value: 1
            }
        });
    });
});