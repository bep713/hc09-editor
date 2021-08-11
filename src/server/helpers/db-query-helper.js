let dbQueryHelper = {};

dbQueryHelper.dbEditorService = null;

dbQueryHelper.initialize = (dbEditorService) => {
    dbQueryHelper.dbEditorService = dbEditorService;
}

dbQueryHelper.getAllTeams = async () => {
    const file = dbQueryHelper.dbEditorService.activeDbHelper.file;

    await file.TEAM.readRecords();
    return file.TEAM.records.map((team) => {
        return {
            'TGID': team._fields['TGID'].value,
            'cityName': team._fields['TLNA'].value,
            'nickName': team._fields['TDNA'].value,
            'colors': {
                'r': team._fields['TBCR'].value,
                'g': team._fields['TBCG'].value,
                'b': team._fields['TBCB'].value
            }
        }
    });
};

dbQueryHelper.getAllCoaches = async () => {
    const file = dbQueryHelper.dbEditorService.activeDbHelper.file;
    const [_, teamData] = await Promise.all([file.COCH.readRecords(), dbQueryHelper.getAllTeams()]);

    return file.COCH.records.map((cochRecord) => {
        const teamId = cochRecord.fields['TGID'].value;

        const team = teamData.find((team) => {
            return team.TGID === teamId;
        });

        return {
            'team': team,
            'overall': cochRecord.fields['POVS'].value,
            'lastName': cochRecord.fields['CLNM'].value,
            'firstName': cochRecord.fields['CFNM'].value,
            'portraitId': cochRecord.fields['CSXP'].value,
            'position': getCoachPosition(cochRecord.fields['COPS'].value),
        }
    });
};

module.exports = dbQueryHelper;

function getCoachPosition(val) {
    switch(val) {
        case 0:
            return {
                long: 'Head coach',
                short: 'HC'
            };
        case 1:
            return {
                long: 'Offensive coordinator',
                short: 'OC'
            };
        case 2:
            return {
                long: 'Defensive coordinator',
                short: 'DC'
            };
        case 3:
            return {
                long: 'Special teams coordinator',
                short: 'STC'
            };
        case 4:
            return {
                long: 'Quarterbacks coach',
                short: 'QBC'
            };
        case 5:
            return {
                long: 'Running backs coach',
                short: 'RBC'
            };
        case 6:
            return {
                long: 'Wide receivers coach',
                short: 'WRC'
            };
        case 7:
            return {
                long: 'Offensive line coach',
                short: 'OLC'
            };
        case 8:
            return {
                long: 'Linebackers coach',
                short: 'LBC'
            };
        case 9:
            return {
                long: 'Defensive line coach',
                short: 'DLC'
            };
        case 10:
            return {
                long: 'Defensive backs coach',
                short: 'DBC'
            };
    }
}