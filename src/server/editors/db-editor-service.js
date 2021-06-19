const log = require('../../util/logger');
const TDBHelper = require('madden-file-tools/helpers/TDBHelper');

let dbService = {};

dbService.activeDbHelper = null;

dbService.openFile = async (filePath) => {
    dbService.activeDbHelper = new TDBHelper();
    log.info(filePath);
    await dbService.activeDbHelper.load(filePath);
};

dbService.getTables = () => {
    if (!dbService.activeDbHelper) { return null; }

    return dbService.activeDbHelper.file.tables.map((table) => {
        return table.name;
    });
};

dbService.getTableData = async (tableName, options) => {
    const table = dbService.activeDbHelper.file[tableName];

    if (!table) {
        throw new Error('table name does not exist.');
    }

    if (table.records.length === 0) {
        await table.readRecords();
    }

    let records = table.records;

    if (options) {
        if (options.startIndex) {
            records = records.slice(options.startIndex);
        }

        if (options.recordCount) {
            records = records.slice(0, options.recordCount);
        }
    }

    return {
        'filteredRecords': records.map((record) => {
            let obj = {};

            Object.keys(record.fields).forEach((field) => {
                obj[field] = record.fields[field].value;
            });

            return obj;
        }),
        'totalRecords': table.records.length
    };
};

module.exports = dbService;