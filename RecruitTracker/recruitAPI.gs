const columns = Object.freeze({
  id: 0,
  name: 1,
  lastScouted: 2,
  lastDecision: 3
});

const informationSheetName = "Information";

function createPlayerFromRow(rowValues) {
  return {
    id: rowValues[columns.id],
    name: rowValues[columns.name],
    lastScouted: rowValues[columns.lastScouted],
    lastDecision: rowValues[columns.lastDecision]
  };
}

function findPlayer(playerId) {
  const startingRow = 2; // 1st row is header
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(informationSheetName);
  var columnValues = sheet.getRange(startingRow, 1, sheet.getLastRow()).getValues();

  for(let i = 0; i <= columnValues.length; i++) {
    if (columnValues[i] == playerId) {
      const rowNumber = startingRow + i;
      const rowValues = sheet.getRange(rowNumber, 1, 1, Object.keys(columns).length).getValues()[0];

      return { rowNumber, player: createPlayerFromRow(rowValues) };
    }
  }

  return undefined;
}

function findColumnIdByHeaderValue(sheet, headerValue) {
  let range = sheet.getRange(1, 1, 1, sheet.getLastColumn());

  let values = range.getValues()[0];
  return values.findIndex(headerValue);
}

function insertPlayerData(sheet, player) {
  // We insert at the beginning for simplicity / faster glance at latest info
  sheet.insertRowBefore(2);
  writePlayerData(sheet, 2, player);
}

function writePlayerData(sheet, rowNumber, player) {
  let range = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn());

  // We want to make sure that players that have been messaged are flagged as such regardless of other new incoming values
  let currentDecision = range.getValues()[0][columns.lastDecision];
  if (currentDecision == 'Messaged') player.lastDecision = 'Messaged';

  let columnHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  for (let i = 0; i < columnHeaders.length; i++) {
    const header = columnHeaders[i];
    const v = player[header];

    if (v) {
      sheet.getRange(rowNumber, i + 1).setValue(v);
    }
  }
}

function createOutputResponse(response) {
  return ContentService.createTextOutput(JSON.stringify(response));
}

function findPlayersWithDecision(decision = []) {
  const startingRow = 2; // 1st row is header
  const results = {};
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(informationSheetName);
  var columnValues = sheet.getRange(startingRow, columns.lastDecision, sheet.getLastRow()).getValues();

  for(let i = 0; i <= columnValues.length; i++) {
    // Check if
    if (decision.includes(columnValues[i])) {
      const rowNumber = startingRow + i;
      const rowValues = sheet.getRange(rowNumber, 1, 1, Object.keys(columns).length).getValues()[0];

      const player = createPlayerFromRow(rowValues);
      results[player.id] = player;
    }
  }

  return results;
}

function getPlayersWithDecisionsResponse(decisions) {
  decisions = ['Recruitable', 'Rejected'];
  const search = findPlayersWithDecision(decisions);

  if (!search) {
    response.code = 404;
    response.msg = `No players found with lastDecision: ${decisions.join(', ')}`;

    return createOutputResponse(response);
  }

  response.code = 200;
  response.object = search;

  return createOutputResponse(response);
}

function getSinglePlayerResponse(id) {
  const search = findPlayer(id);

  if (!search) {
    response.code = 404;
    response.msg = `Player with ID ${id} not found`;

    return createOutputResponse(response);
  }

  const { player } = search;

  response.code = 200;
  response.msg = `Player ${player.name} (${player.id}) has been found. Last Decision: ${player.lastDecision}`;
  response.object = player;

  return response;
}

function doGet(request) {
  let response = {
    code: 400,
    msg: 'ERROR - Response not set',
    object: undefined
  };

  // request.parameter holds the url args of the request
  const args = request.parameter;
  if (Object.keys(args).length == 0) {
    response.msg = 'ERROR - No parameters defined';
    return createOutputResponse(response);
  }

  if (args.playerId) {
    response = getSinglePlayerResponse(args.playerId)
    return createOutputResponse(response);
  } else if (args.nonmessaged) {
    response = getPlayersWithDecisionsResponse(['Recruitable', 'Rejected']);
    return createOutputResponse(response);
  }

  response.msg = `ERROR - Invalid argument(s):\n${Object.keys(args).join(', ')}`;
  response.code = 400;

  return createOutputResponse(response);
}

function doPost(request) {
  let { contents } = request.postData;
  let json = JSON.parse(contents);
  let response = {
    code: 400,
    msg: 'ERROR - Response not set'
  };

  if (Object.keys(json).length == 0) {
    response.msg = `Invalid json\n${contents}`;
    response.code = 400;
    return createOutputResponse(response);
  }

  if (!json.id) {
    response.msg = `JSON object does not contain 'id' field\n${contents}`;
    response.code = 400;
    return createOutputResponse(response);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(informationSheetName);
  const search = findPlayer(json.id);

  if (search) {
    writePlayerData(sheet, search.rowNumber, json);
    response.msg = `Replaced player information from \n${contents}`;
    response.code = 200;
  } else {
    insertPlayerData(sheet, json);
    response.msg = `Inserted new line from\n${contents}`;
    response.code = 200;
  }

  return createOutputResponse(response);
}
