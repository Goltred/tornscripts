function insertTrade(json) {
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trades");
  json.items.forEach((item) => {
    ss.insertRowBefore(2);
    let range = ss.getRange(2,1,1,8);
    let values = [
      json.tradeID,
      item.category,
      item.name,
      item.quantity,
      item.marketPrice || 'Invalid',
      item.modifiedPrice || 'Invalid',
      item.marketPrice * item.quantity || 'Invalid',
      item.modifiedPrice * item.quantity || 'Invalid'
    ];
    range.setValues([values]);
  });
}

function findTrade(tradeId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trades");
  var columnValues = sheet.getRange(2, 1, sheet.getLastRow()).getValues(); //1st is header row

  for(let i = 0; i < columnValues.length; i++) {
    if (columnValues[i] == tradeId) return true;
  }

  return false;
}

function doPost(e) {
  let contents = e.postData.contents;
  let json = JSON.parse(contents);
  let response = {}

  if (Object.keys(json).length > 0) {
    if (json.items.length == 0) {
      response.msg = `Invalid trade. No items were sent\n${contents}`;
      response.code = 2;
    } else {
      insertTrade(json);
      response.msg = `Inserted new line from\n${contents}`;
      response.code = 0;
    }
  } else {
    response.msg = `Invalid json\n${contents}`;
    response.code = 1;
  }

  return ContentService.createTextOutput(JSON.stringify(response));
}

function doGet(e) {
  let response = {
    code: 0,
    msg: ''
  };

  if (Object.keys(e.parameter).length > 0 && e.parameter.tradeId) {
    if (findTrade(e.parameter.tradeId)) {
      response.code = 1;
      response.msg = `Trade with ID ${e.parameter.tradeId} already exists`;
    }
  }

  return ContentService.createTextOutput(JSON.stringify(response));
}
