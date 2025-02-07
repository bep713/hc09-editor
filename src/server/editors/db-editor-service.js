const fs = require('fs');
const xlsx = require('xlsx');
const crypto = require('crypto');
const log = require('../../util/logger');
const DBHelperFactory = require('madden-file-tools/helpers/DBHelperFactory');

let dbService = {};

dbService.activeDbHelper = null;

dbService.openFile = async (filePath) => {
    dbService.activeDbHelper = await DBHelperFactory.createHelper(filePath);
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
        'schema': table.fieldDefinitions.reduce((accum, cur) => {
            accum[cur.name] = cur.maxValue;
            return accum;
        }, {}),
        'totalRecords': recordCount,
        'indexMapping': records.map((record) => {
            return record.index;
        })
    };
};

dbService.exportTable = async (tableName, options) => {
    if (!options.exportLocation) {
        return;
    }

    const table = dbService.activeDbHelper.file[tableName];

    let headers = table.fieldDefinitions.map((fieldDef) => {
        return fieldDef.name;
    });

    const data = table.records.map((record) => {
        return headers.map((fieldKey) => { 
            if(!record.fields[fieldKey])
            {
                return '';
            }
            
            const field = record.fields[fieldKey];
            return field.value;
        });
    });

    let wb = xlsx.utils.book_new();

    const ws = xlsx.utils.json_to_sheet([headers].concat(data), {
        'skipHeader': true
    });

    xlsx.utils.book_append_sheet(wb, ws);

    try {
        xlsx.writeFile(wb, options.exportLocation);
    }
    catch (err) {
        log.error(err);
        throw err;
    }

    return true;
};

dbService.importTable = async (tableName, options) => {
    const wb = xlsx.readFile(options.importLocation);
    const rawSheetData = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
        'raw': false
    });

    let table = dbService.activeDbHelper.file[tableName];

    rawSheetData.forEach((row, index) => {
        let record = table.records[index];

        Object.keys(row).forEach((fieldKey) => {
            if(!record.fields[fieldKey]) {
                return;
            }
           
            record.fields[fieldKey].value = row[fieldKey];
        });
    });
};

dbService.updateTableData = async (options) => {
    if (options && options.tableName && options.row !== undefined && options.field && options.value !== undefined) {
        const table = dbService.activeDbHelper.file[options.tableName];

        if (table && table.records.length > options.row) {
            const field = table.records[options.row].fields[options.field];

            if (field) {
                field.value = options.value;
            }
            else {
                throw new Error('Field does not exist.');
            }
        }
        else {
            throw new Error('Either table does not exist or row index out of range.')
        }
    }
    else {
        throw new Error('Required options are missing. Need tableName, row, field, and value');
    }
};

dbService.saveActiveFile = async (options) => {
    let outputFile = options && options.path ? options.path : null;
    await dbService.activeDbHelper.save(outputFile);
};

module.exports = dbService;