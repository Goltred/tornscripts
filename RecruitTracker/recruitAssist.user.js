// ==UserScript==
// @name Torn Recruitment Assistant
// @namespace https://github.com/Goltred/tornscripts
// @version 1.0.1
// @description Compare stats of a player against parameters to quickly assess recruitment value
// @author Goltred
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCombat.user.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCombat.user.js
// @match https://www.torn.com/personalstats.php?ID*
// @match https://www.torn.com/messages.php*
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_xmlhttpRequest
// @run-at document-end
// ==/UserScript==

// Reference to script mutation observer to kill later on
let observer;

// Default values for the watchlist
const defaults = {
  watchList: [],
  template: "",
  subject: ""
};

const decisions = {
  messaged: 'Messaged',
  recruitable: 'Recruitable',
  rejected: 'Rejected'
};

// Base URL for images used on the UI
const imgBaseUrl = 'https://raw.githubusercontent.com/Goltred/tornscripts/master/images';

class Storage {
  static getSettings(defaultSettings) {
    const settings = GM_getValue('settings');

    if (!settings) {
      // We need to setup the defaults
      GM_setValue('settings', defaultSettings);
      return defaults;
    }

    return settings;
  }

  static saveSettings(lastSeen) {
    const saved = Storage.getSettings({});
    const uiSettings = Settings.fromPersonalStatsPage()
    const extra = lastSeen ? { lastSeen } : {};

    const mixed = Object.assign({}, saved, uiSettings, extra);

    GM_setValue('settings', mixed);
  }

  static saveLastSeen(lastSeen) {
    Storage.saveSettings(lastSeen);
  }
}

class Settings {
  static fromUI(url) {
    if (url.includes('messages.php'))
      return Settings.fromGeneralSettings();
    else if (url.includes('personalstats.php'))
      return Settings.fromPersonalStatsPage();
  }

  static fromGeneralSettings() {
    const template = $("#tra-msg").val();
    const appURL = $('#tra-appurl').val();
    const subject = $('#tra-msgsubject').val();

    return { template, appURL, subject };
  }

  static fromMessagePage() {
    return Settings.fromGeneralSettings();
  }

  static fromPersonalStatsPage() {
    const settings = Settings.fromGeneralSettings();
    const watchList = [];
    const watchOptions = $("#tra-watchlist").find("option");

    watchOptions.each((idx, option) => {
      watchList.push(option.value);
    });

    settings.watchList = watchList;

    return settings;
  }
}

class Utilities {
  static clearValue(text) {
    // Text in the detailed page can have:
    // $ for money
    // , for thousands
    // (/d+%) for... something
    // -- for private info?
    // d h m s for time

    if (typeof text == 'number' || !text) return text;

    if (text.startsWith('$')) return parseInt(removeThousandsSep(text.slice(1)));
    if (text.includes('%')) return parseInt(removeThousandsSep(text.split(' ')[0]));
    if (PlayerInfo.parseTornDate(text)) return text;
    if (text === '--') return text;

    return parseInt(removeThousandsSep(text));
  }
}

class PlayerInfo {
  static parseTornDate(text) {
    let regexp = new RegExp('(\\d+)d (\\d+)h (\\d+)m (\\d+)s');

    let match = regexp.exec(text);

    if (match) {
      return {
        d: match[1],
        h: match[2],
        m: match[3],
        s: match[4]
      }
    }

    return undefined;
  }

  static getClearValue(player, stat) {
    if (stat.includes('.')) {
      const split = stat.split('.');
      const tornDate = PlayerInfo.parseTornDate(player[split[0]]);

      if (tornDate) {
        return Utilities.clearValue(tornDate[split[1]]);
      }

      console.error(`Torn Recruit Assistant - Tried to get a torn date element from an invalid value: ${stat}`);
      return undefined;
    }

    return Utilities.clearValue(player[stat])
  }

  static getRecruitValue(statElement) {
    // This is prone to break, but the value we have to compare is the second column to the right of the stat name
    // also, the value itself is in the middle span... o.O
    const statValueElement = $(statElement).next().next().children(':nth-child(2)');
    return Utilities.clearValue($(statValueElement).text());
  }

  // pos = 1 is the second player in the detailed pane
  static getNameId() {
    const playerText = $('div[class^="userLabel"]:nth(1)').text();

    let [name, id] = playerText.split(' ');
    name = name.slice(1); // remove leading + sign on this element
    id = id.replace('[', '').replace(']', ''); // remove brackets from id

    return { name, id };
  }

  static fromDetailedPage() {
    const player = PlayerInfo.getNameId();

    const statSearch = $('div[class^="statName"]');

    statSearch.each((idx, el) => {
      const statName = $(el).text();
      player[statName] = PlayerInfo.getRecruitValue(el);
    });

    return player;
  }
}

function copyTextToClipboard(elementId) {
  var range = document.createRange();
  range.selectNode(document.getElementById(elementId));
  window.getSelection().removeAllRanges(); // clear current selection
  window.getSelection().addRange(range); // to select text
  document.execCommand("copy");
  window.getSelection().removeAllRanges();// to deselect
}

function getNonMessaged(appURL, lastSeen, callback) {
  const nonMessagedURL = `${appURL}?nonmessaged=1`;

  GM_xmlhttpRequest({
    method: 'GET',
    url: nonMessagedURL,
    onload: function(response) {
      let json = JSON.parse(response.responseText);
      if (json.code == 200) {
        // This should have returned an object of players, which we can save to the document for future reference
        window.traPlayers = json.object;
        callback(json.object, lastSeen);
      }
    },
    onerror: (response) =>
    {
      console.log(response);
    }
  });
}

function updateNonMessagedDropdown(players, lastSeen) {
  const el = $('#tra-recipient');

  el.empty();
  for(const [id, player] of Object.entries(players)) {
    el.append(`<option value="${id}" ${lastSeen && lastSeen.id == id ? "selected" : ""}>${player.name} - ${player.lastDecision}</option>`);
  }
}

function settingsUI(beforeElementId, settings) {
  // Main boxes definitions
  const traUI = $('<div id="tra-ui"></div>');
  const boxTitle = $('<div class="title-black top-round m-top10">Torn Recruitment Assistant<button type="button" id="tra-save" style="float: right; background-color: lightgray;border: 1px solid black;height: 2em;border-radius: 5px;color: black;"">Save</button></div>');
  const msgTemplateBody = $('<div style="border-top: 1px solid #3e3e3e; border-bottom: 1px solid #3e3e3e; background-color: #2e2e2e; color: #ccc; padding: 10px;"></div>');
  const appURLBody = $('<div style="border-top: 1px solid #3e3e3e; border-bottom: 1px solid #3e3e3e; background-color: #2e2e2e; color: #ccc; padding: 10px;"></div>');
  const boxBody = $('<div style="border-top: 1px solid #3e3e3e; background-color: #2e2e2e; color: #ccc; border-radius: 0 0 5px 5px; padding: 10px; display: flex;"></div>');

  // Set the location of stuff
  $(beforeElementId).before(traUI);
  traUI.append(boxTitle);
  traUI.append(appURLBody);
  traUI.append(msgTemplateBody);

  traUI.append(boxBody);

  // Control to save the application URL
  appURLBody.append($(`<label for="tra-appurl" style="margin-right: 5px; width: 100%;">Google App URL</label><input type="text" id="tra-appurl" value="${settings.appURL}">`));

  // Control for message template
  msgTemplateBody.append($(`<div><label for="tra-msg">Message Subject</label></div>
    <div><input type="text" style="width: 100%;" id="tra-msgsubject" value="${settings.subject}"></div>
    <div><label for="tra-msg">Message Template</label></div>
    <div><textarea id="tra-msg" rows="8" style="width: 100%; resize: vertical;">${settings.template}</textarea></div>`));

  $('#tra-save').on('click', () => {
    Storage.saveSettings();
  });

  return boxBody;
}

function messageUI(settings) {
  const boxBody = settingsUI('#mailbox-main', settings);
  boxBody.append($(`<select id="tra-recipient"></select><button type="button" id="tra-fillmessage">Fill Message</button>`));

  if (settings.lastSeen) {
    $("#tra-recipient").append($(`<option value="${settings.lastSeen.id}">${settings.lastSeen.name} - ${settings.lastSeen.lastDecision}</option><option value="0">Loading Non-Messaged players</option>`));

    // Save the last seen to window.traPlayers in case we use it before the GET request finishes
    window.traPlayers = {};
    window.traPlayers[settings.lastSeen.id] = settings.lastSeen;
  } else {
    $("#tra-recipient").append(`<option value="0">Loading Non-Messaged players</option>`);
  }

  getNonMessaged(settings.appURL, settings.lastSeen, updateNonMessagedDropdown);

  const fillMessageElement = $('#tra-fillmessage');
  fillMessageElement.on('click', () => {
    let uiSettings = Settings.fromUI(document.documentURI);

    let option = $('#tra-recipient > option:selected');
    const id = option.val();

    const player = window.traPlayers[id];

    $('#ac-search-0').val(`${player.name} [${id}]`);

    $('input.subject').val(replacePlayerStats(uiSettings.subject, player));

    if (tinymce) {
      const mailcompose = tinymce.get('mailcompose');

      if (mailcompose)
        mailcompose.setContent(generateMessage(uiSettings.template, player));
    }
  });

  fillMessageElement.click();

  $('.form-submit-send').on('click', () => {
    let uiSettings = Settings.fromUI(document.documentURI);

    let option = $('#tra-recipient > option:selected');
    const id = option.val();

    const player = { id, lastDecision: 'Messaged' };

    postData(uiSettings.appURL, player);
  });
}

function isValidStat(txt) {
  const calculatedField = splitByOperation(txt);

  if (Object.keys(calculatedField).length > 0) {
    const stat1Check = $(`div[class^="statName"]:contains("${calculatedField.stat1}")`).length > 0;
    const stat2Check = $(`div[class^="statName"]:contains("${calculatedField.stat2}")`).length > 0;
    return stat1Check && stat2Check;
  }

  return $(`div[class^="statName"]:contains("${txt}")`).length > 0;
}

function recruitUI(settings) {
  const boxBody = settingsUI('div.content-title', settings);

  // Main controls definitions
  const firstRow = $('<p style="display: contents;"></p>');
  const leftColumn = $('<div style="width: 50%; display: inline-block;"></div>');

  leftColumn.append($('<div><label for="tra-statname" style="margin-right: 3px;">Stat Name</label></label><input type="text" id="tra-statname"></div>'));
  leftColumn.append($(`<div><label for="tra-operation" style="margin-right: 3px;">Operator</label><select id="tra-operation">
<option value="<"><</option>
<option value="<="><=</option>
<option value="=">=</option>
<option value=">=">>=</option>
<option value=">">></option>
</select></div>`));
  leftColumn.append($('<div><label for="tra-statvalue" style="margin-right: 3px;">Value</label><input type="number" id="tra-statvalue"></div>'));
  leftColumn.append($('<div><button type="button" id="tra-addstat" style="background-color: lightgray;border: 1px solid black;height: 2em;border-radius: 5px;color: black;">Add to Watch List</button></div>'));
  leftColumn.append($('<hr />'))
  const watchListContainer = $('<div><p style="margin-top: 5px;"><strong>Stats Watch List</strong></p></div>');
  const watchList = $('<select name="watch-list" size="6" id="tra-watchlist"></select>');
  settings.watchList.forEach((v) => {
    watchList.append($(`<option value="${v}">${v}</option>`));
  });
  watchListContainer.append(watchList);
  leftColumn.append(watchListContainer);
  leftColumn.append('<button type="button" id="tra-removestat" style="background-color: lightgray;border: 1px solid black;height: 2em;border-radius: 5px;color: black;">Remove Stat</button>');
  firstRow.append(leftColumn);

  let rightColumn = $('<div style="width: 50%; display: inline-block; padding-left: 10px;"></div>');
  rightColumn.append($('<div id="tra-decision" style="width: 100%; display: inline-block; vertical-align: top;"></div>'));
  rightColumn.append($('<p><span id="tra-generatedmsg"></span></p>'));

  firstRow.append(rightColumn);
  boxBody.append(firstRow);

  $('#tra-save').on('click', () => {
    Storage.saveSettings();
    evaluateRecruit();
  });

  $("#tra-addstat").on("click", () => {
    const statName = $("#tra-statname").val().trim();
    const statValue = $("#tra-statvalue").val().trim();
    const statOperation = $("#tra-operation").val().trim();

    if (!statName || !isNumber(statValue)) return;

    if (!isValidStat(statName)) return;

    const watchValue = `${statName} ${statOperation} ${statValue}`;
    $("#tra-watchlist").append(`<option value="${watchValue}">${watchValue}</option>`);

    Storage.saveSettings();
    evaluateRecruit();
  });

  $("#tra-removestat").on("click", () => {
    const option = $("#tra-watchlist").find(":selected");
    option.remove();
    Storage.saveSettings();
    evaluateRecruit();
  });
}

function removeThousandsSep(str) {
  return str.replace(',', '');
}

function addThousandsSep(str) {
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function clearDecision() {
  $('#tra-decision').empty();
  $('#tra-generatedmsg').empty();
}

function replacePlayerStats(text, player) {
  let replacedString = text;
  for (let [k, v] of Object.entries(player)) {
     replacedString = replacedString.replace(`{${k}}`, addThousandsSep(v.toString()));
  }

  return replacedString
}

function generateMessage(template, player) {
  // since this is going into tinymce, we need to convert \n to enclosed lines with <p>
  let tinymceMsg = template.split('\n').join('<br />')

  tinymceMsg = replacePlayerStats(tinymceMsg, player);

  return tinymceMsg;
}

function showMessaged() {
  clearDecision();
  const imgName = "messaged.png";
  $('#tra-decision').append($(`<img src="${imgBaseUrl}/${imgName}" style="margin-left: auto; margin-right: auto; display: block;">`));
}

function showDecision(recruitable = false, player = {}, results = {}) {
  clearDecision();
  const imgName = recruitable ? "recruit.png" : "reject.png";

  const decision = $('#tra-decision');
  decision.append($(`<div><a href="messages.php#/p=compose"><img src="${imgBaseUrl}/${imgName}" style="margin-left: auto; margin-right: auto; display: block;"></a></div>`));
  decision.append($('<div style="margin: 10px 0 5px 0;"><strong>Results:</strong></div>'));

  for (let [k, v] of Object.entries(results)) {
    decision.append($(`<div><span style="color: ${v.satisfies ? "green" : "red"};">${v.satisfies ? "&#10004;" : "&#10008;"} ${k} is ${v.value}</span></div>`));
  }
}

function splitByComparison(txt) {
  const comparisons = ['<', '<=', '=', '>=', '>'];

  for (let i = 0; i < comparisons.length; i++) {
    operator = comparisons[i];
    const search = txt.indexOf(` ${operator} `);
    if (search === -1) continue;

    const split = txt.split(` ${operator} `);
    stat = split[0].trim();
    value = split[1].trim();

    return [stat, operator, Utilities.clearValue(value)];
  }

  return [];
}

function splitByOperation(txt) {
  const operations = ['+', '-', '*', '/'];

  for (let i = 0; i < operations.length; i++) {
    operation = operations[i];
    if (!txt.includes(operation)) continue;

    const split = txt.split(` ${operation} `);
    return {stat1: split[0].trim(), operation, stat2: split[1].trim() }
  }

  return {};
}

// Translate saved watch into an easier to work object
function watchedStats(watchList) {
  const stats = {};

  watchList.forEach((watch) => {
    const [ stat, operator, value ] = splitByComparison(watch);

    stats[stat] = {operator, value};
  });

  return stats;
}

function statSatisfies(statValue, comparison) {
  switch(comparison.operator) {
    case "<":
      return statValue < comparison.value;
    case "<=":
      return statValue <= comparison.value;
    case "=":
      return statValue = comparison.value;
    case ">=":
      return statValue >= comparison.value;
    case ">":
      return statValue > comparison.value;
  }

  return false;
}

function runCalculation(stat1, operator, stat2, decimals = 1) {
  let result;
  switch(operator) {
    case '-':
      result = stat1 - stat2;
      break;
    case '+':
      result = stat1 + stat2;
      break;
    case '*':
      result = stat1 * stat2;
      break;
    case '/':
      result = stat1 / stat2;
      break;
    default:
      return undefined;
  }

  return parseFloat(result.toFixed(decimals));
}

function postData(url, player) {
  // Fetch the recruiter name from the left bar
  player.lastSeenBy = $('a[class^="menu-value"]').text();

  GM_xmlhttpRequest({
    method: 'POST',
    data: JSON.stringify(player),
    url
  });
}

function checkPlayerMessaged(url, playerId) {
  return new Promise((resolve, reject) => {
    const parametrizedUrl = `${url}?playerId=${playerId}`;
    GM_xmlhttpRequest({
      method: 'GET',
      url: parametrizedUrl,
      onload: function(response) {
        let json = JSON.parse(response.responseText);
        if (json.code == 200) {
          showMessaged();
          resolve(json.object);
          return;
        }

        if (json.code == 404) {
          resolve(undefined);
          return;
        }

        reject(json.msg);
      },
      onerror: function(response) {
        reject(response);
      }
    });
  });
}

function isPersonalStatsPage() {
  return document.documentURI.includes('personalstats.php');
}

async function evaluateRecruit() {
  const settings = Settings.fromUI(document.documentURI);

  if (settings.watchList.length === 0) {
    clearDecision();
    return;
  }

  const player = PlayerInfo.fromDetailedPage();

  const playerInDB = await checkPlayerMessaged(settings.appURL, player.id);

  const watchValues = watchedStats(settings.watchList);

  let comparisons = [];
  const results = {};
  for(const [statName, comparison] of Object.entries(watchValues)) {
    const calculationCheck = splitByOperation(statName);
    let statValue;
    if (Object.keys(calculationCheck).length > 0) {
      const stat1Value = PlayerInfo.getClearValue(player, calculationCheck.stat1);
      const stat2Value = PlayerInfo.getClearValue(player, calculationCheck.stat2);
      statValue = runCalculation(stat1Value, calculationCheck.operation, stat2Value);
    } else {
      statValue = PlayerInfo.getClearValue(player, statName);
    }

    if (!statValue) continue;

    const satisfies = statSatisfies(statValue, comparison);
    comparisons.push(satisfies);
    results[statName] = { value: statValue, satisfies };
  }

  player.lastScouted = Date.now();

  if (playerInDB && playerInDB.lastDecision === 'Messaged') {
    player.lastDecision = 'Messaged';
    if (isPersonalStatsPage()) postData(settings.appURL, player);
  } else {
    const recruitable = comparisons.every((v) => v);
    showDecision(recruitable, player, results);

    player.lastDecision = recruitable ? decisions.recruitable : decisions.rejected;
    postData(settings.appURL, player);
  }

  // Save to script storage for immediate use in message.php if necessary
  Storage.saveLastSeen(player);
}

async function watchPage() {
  const target = $('body')[0];
  observer = new MutationObserver(async (mutations, observer) => {
    let process = false;
    mutations.forEach((record) => {
      if (typeof record.target.className != "string") return;
      if (!record.target.className.startsWith('scrollArea')) return;

      process = true;
    });

    // We don't process if a mutation for the stats was not detected
    if (!process) return;

    await evaluateRecruit();
    observer.disconnect();
  });

  observer.observe(target, {
    subtree: true,
    childList: true,
  });
}

const traSettings = Storage.getSettings(defaults);
let UIloaded;

if (document.documentURI.includes('personalstats.php')) {
  recruitUI(traSettings);

  watchPage().catch((e) => {
    console.log(e);
  });
} else if (!window.loadingUI && !UIloaded && document.documentURI.includes('messages.php')) { // when opening message from the menu
  // documents seem to be reloaded/recreated by some XHRs, so checking for compose makes sure we run this code once
  window.loadingUI = true;
  window.onload = () => {
    var waitForLoad = () => {
      if (typeof jQuery != "undefined") {
        UIloaded = true;
        messageUI(traSettings);
      } else {
        if (!UIloaded) {
          window.setTimeout(waitForLoad, 500);
        }
      }
    };

    window.setTimeout(waitForLoad, 500);
  };
}
