// ==UserScript==
// @name Torn Recruitment Assistant
// @namespace https://github.com/Goltred/tornscripts
// @version 1.0.0
// @description Compare stats of a player against parameters to quickly assess recruitment value
// @author Goltred
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCombat.user.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCombat.user.js
// @match https://www.torn.com/personalstats.php?ID*
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_xmlhttpRequest
// @run-at document-end
// ==/UserScript==

// Default values for the watchlist
const defaults = {
  watchList: [],
  template: ""
};

const decisions = {
  messaged: 'Messaged',
  recruitable: 'Recruitable',
  rejected: 'Rejected'
};

// Base URL for images used on the UI
const imgBaseUrl = 'https://raw.githubusercontent.com/Goltred/tornscripts/master/images';
const webAppUrl = '';

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

  static saveSettings() {
    const options = Settings.fromUI();
    GM_setValue('settings', options);
  }
}

class Settings {
  static fromUI() {
    const watchList = [];
    const watchOptions = $("#tra-watchlist").find("option");

    watchOptions.each((idx, option) => {
      watchList.push(option.value);
    });

    const template = $("#tra-msg").val();
    const appURL = $('#tra-appurl').val();

    return { watchList, template, appURL };
  }
}

class PlayerInfo {
  static fromDetailedPage() {
    const player = {
      id: 1,
      name: 'scriptTest'
    }

    return player;
  }
}

function recruitUI(settings) {
  const boxTitle = $('<div class="title-black top-round m-top10">Torn Recruitment Assistant<button type="button" id="tra-save" style="float: right;">Save</button></div>');
  $('div.content-title').before(boxTitle);
  const appURLBody = $('<div style="border-top: 1px solid #3e3e3e; border-bottom: 1px solid #3e3e3e; background-color: #2e2e2e; color: #ccc; padding: 10px;"></div>');
  boxTitle.after(appURLBody);
  appURLBody.append($(`<label for="tra-appurl" style="margin-right: 5px;">Google App URL</label><input type="text" id="tra-appurl" value="${settings.appURL}">`));
  const boxBody = $('<div style="border-top: 1px solid #3e3e3e; background-color: #2e2e2e; color: #ccc; border-radius: 0 0 5px 5px; padding: 10px; display: flex;"></div>');
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
  leftColumn.append($('<div><button type="button" id="tra-addstat">Add to Watch List</button></div>'));
  leftColumn.append($('<hr />'))
  const watchListContainer = $('<div><p style="margin-top: 5px;"><strong>Stats Watch List</strong></p></div>');
  const watchList = $('<select name="watch-list" size="6" id="tra-watchlist"></select>');
  settings.watchList.forEach((v) => {
    watchList.append($(`<option value="${v}">${v}</option>`));
  });
  watchListContainer.append(watchList);
  leftColumn.append(watchListContainer);
  leftColumn.append('<button type="button" id="tra-removestat">Remove Stat</button>');
  firstRow.append(leftColumn);

  let rightColumn = $('<div style="width: 50%; display: inline-block; padding-left: 10px;"></div>');
  rightColumn.append($(`<div><label for="tra-msg">Message Template</label></div><div><textarea id="tra-msg" rows="4" style="width: 100%;">${settings.template}</textarea></div>`));
  rightColumn.append($('<div id="tra-decision" style="width: 100%; display: inline-block; vertical-align: top;"></div>'));
  rightColumn.append($('<p><span id="tra-generatedmsg"></span></p>'));

  firstRow.append(rightColumn);
  boxBody.append(firstRow);

  appURLBody.after(boxBody);

  $('#tra-save').on('click', () => {
    Storage.saveSettings();
    evaluateRecruit();
  });

  $("#tra-addstat").on("click", () => {
    const statName = $("#tra-statname").val().trim();
    const statValue = $("#tra-statvalue").val().trim();
    const statOperation = $("#tra-operation").val().trim();

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

function showDecision(recruitable = false, results = {}, template = "") {
  clearDecision();
  const imgName = recruitable ? "recruit.png" : "reject.png";

  $('#tra-decision').append($(`<img src="${imgBaseUrl}/${imgName}" style="margin-left: auto; margin-right: auto; display: block;"></img>`));

  if (recruitable) {
    console.log(results);
    const statLines = [];
    for(let [stat, value] of Object.entries(results)) {
      statLines.push(`  * ${stat} at ${addThousandsSep(value.toString())}`);
    }

    $('#tra-generatedmsg').text(template.replace('{stats}', statLines.join('<br \>')));
  }
}

// Translate saved watch into an easier to work object
function watchedStats(watchList) {
  const operators = ['<', '<=', '=', '>=', '>'];
  const results = {};

  watchList.forEach((watch) => {
    let stat;
    let value;

    operators.forEach((operator) => {
      const search = watch.indexOf(` ${operator} `);
      if (search === -1) return;

      const split = watch.split(` ${operator} `);
      stat = split[0].trim();
      value = parseInt(split[1].trim());
      results[stat] = {operator, value};
    })
  });

  return results;
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

function postData(decision) {
  const player = PlayerInfo.fromDetailedPage();

  player.lastScouted = Date.now();
  player.lastDecision = decision

  GM_xmlhttpRequest({
    method: 'POST',
    data: JSON.stringify(player),
    url: webAppUrl,
    onload: function (response) {
      console.log('Recruit info sent. Process completed.');
      console.log(response);
    }
  });
}

function evaluateRecruit() {
  const settings = Settings.fromUI();

  if (settings.watchList.length == 0) {
    clearDecision();
    return;
  }

  const watchValues = watchedStats(settings.watchList);
  const results = {};

  let comparisons = [];
  for(const [statName, comparison] of Object.entries(watchValues)) {

    const divs = $('div[class^="statName"]');
    let stat;
    divs.each((idx, el) => {
      if ($(el).text() === statName) {
        stat = el;
        return;
      }
    });

    if (!stat) return;

    // This is prone to break, but the value we have to compare is the second column to the right of the stat name
    // also, the value itself is in the middle span... o.O
    const statValueElement = $(stat).next().next().children(':nth-child(2)');
    const statValue = parseInt(removeThousandsSep(statValueElement.text()));

    comparisons.push(statSatisfies(statValue, comparison));
    results[statName] = statValue;
  }

  const recruitable = comparisons.every((v) => v);
  showDecision(recruitable, results, settings.template);

  const decision = recruitable ? decisions.recruitable : decisions.rejected;
  postData(decision);
}

function watchPage() {
  const target = $('body')[0];
  const observer = new MutationObserver((mutations, observer) => {
    let process = false;
    mutations.forEach((record) => {
      if (typeof record.target.className != "string") return;
      if (!record.target.className.startsWith('scrollArea')) return;

      process = true;
    });

    // We don't process if a mutation for the stats was not detected
    if (!process) return;

    evaluateRecruit();
  });

  observer.observe(target, {
    subtree: true,
    childList: true,
  });
}

const settings = Storage.getSettings(defaults);

recruitUI(settings);

watchPage();