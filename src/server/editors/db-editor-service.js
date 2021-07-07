const log = require('../../util/logger');
const TDBHelper = require('madden-file-tools/helpers/TDBHelper');

let dbService = {};

dbService.activeDbHelper = null;

dbService.openFile = async (filePath) => {
    dbService.activeDbHelper = new TDBHelper();
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
    let recordCount = table.records.length;

    if (options) {
        if (options.sort !== undefined && options.sort.field && options.sort.order) {
            records.sort((a, b) => {
                const aValue = a.fields[options.sort.field].value;
                const bValue = b.fields[options.sort.field].value;

                if (aValue < bValue) {
                    return options.sort.order === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return options.sort.order === 'asc' ? 1 : -1;
                }

                return 0;
            });
        }

        if (options.filter !== undefined) {

            Object.keys(options.filter).forEach((filterKey) => {
                const currentFilter = options.filter[filterKey];
                let tempFilterResults = [];

                if (currentFilter.operator === 'and') {
                    tempFilterResults = records;
                }

                currentFilter.constraints.forEach((constraint) => {
                    if (currentFilter.operator === 'and') {
                        tempFilterResults = filterValue(tempFilterResults, filterKey, constraint);
                    }
                    else {
                        const result = filterValue(records, filterKey, constraint);
                        tempFilterResults = tempFilterResults.concat(result);
                    }
                });

                records = tempFilterResults;
                recordCount = records.length;
            });

            function filterValue(arrayToFilter, filterKey, constraint) {
                return arrayToFilter.filter((record) => {
                    let field = record.fields[filterKey];

                    if (field !== undefined) {
                        let value = getLowerCaseIfApplicable(field.value);
                        let filterValue = getLowerCaseIfApplicable(constraint.value);

                        switch(constraint.matchMode) {
                            case 'equals':
                                return value == filterValue;
                            case 'contains':
                                return value.indexOf(filterValue) > -1;
                            case 'startsWith':
                                return value.startsWith(filterValue);
                            case 'endsWith':
                                return value.endsWith(filterValue);
                            case 'notEquals':
                                return value != filterValue;
                            case 'notContains':
                                return value.indexOf(filterValue) === -1;
                            case 'lt':
                                return value < filterValue;
                            case 'lte':
                                return value <= filterValue;
                            case 'gt':
                                return value > filterValue;
                            case 'gte':
                                return value >= filterValue;
                        }
                    }
                });
            };

            function getLowerCaseIfApplicable(value) {
                if (typeof value === 'string' || value instanceof String) {
                    return value.toLowerCase();
                }
                else {
                    return value;
                }
            };
        }

        if (options.startIndex !== undefined) {
            records = records.slice(options.startIndex);
        }

        if (options.recordCount !== undefined) {
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
        'totalRecords': recordCount
    };
};

module.exports = dbService;