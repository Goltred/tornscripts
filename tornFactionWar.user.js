// ==UserScript==
// @name Torn Faction War Filter
// @namespace https://github.com/Goltred/tornscripts
// @version 1.2.1
// @description Filtering controls for faction war view.
// @author Goltred
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionWar.user.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionWar.user.js
// @match https://www.torn.com/factions.php*
// @grant GM_setValue
// @grant GM_getValue
// @run-at document-end
// ==/UserScript==

// Configuration values
const defaults = {
  hideIdle: false,
  hideOffline: false,
  hideOnline: false,
  hideJail: true,
  hideOkay: false,
  hideTraveling: true,
  hideHospital: true
};

const selectors = {
  idle: 'idle',
  offline: 'offline',
  online: 'online',
  memberRow: 'div.enemy-faction > div.members-cont > ul.members-list'
};

const statuses = {
  okay: 'Okay',
  hospital: 'Hospital',
  jail: 'Jail',
  traveling: 'Traveling',
  mugged: 'Mugged'
};

const ScriptStatus = {
  InFactionView: 0,
  InProfile: 1
}

let log;

function addToWarFilter(element) {
  let row = new MemberRow(element);
  Storage.append(row.userid, row.name);
  WarUI.RefreshHiddenUsers();
}

class MobileLogWindow {
  constructor(show = false) {
    if (show) this.showUI();
  }

  showUI() {
    if ($('#tcwf-log').length === 0) {
      const el = $(`
      <div style="background-color: lightyellow;">
      <p style="padding-bottom: 5px;"><strong>Torn Hospital Log Window</strong></p>
      <div id="tcwf-log" style="max-height:100px; overflow-y: scroll;"></div>
      `);
      $('#factions').before(el);
    }
  }

  append(msg) {
    $('#tcwf-log').append(`<p>${msg}</p>`);
  }
}

class Storage {
  static async append(profileId, name) {
    if (!profileId) {
      log.append('Storage.append called without profile Id');
      return;
    }

    let disabled = GM_getValue('disabled');

    if (!disabled) disabled = {};

    disabled[profileId] = name;
    GM_setValue('disabled', disabled);
  }

  static get(profileId) {
    const disabled = GM_getValue('disabled');

    if (disabled) {
      if (profileId && profileId in disabled) return disabled[profileId];

      return disabled;
    }

    return {}
  }

  static remove(profileId) {
    let disabled = GM_getValue('disabled');

    if (disabled) {
      if (profileId && profileId in disabled) {
        delete disabled[profileId];
      } else {
        disabled = {}
      }

      GM_setValue('disabled', disabled);
    }
  }

  static getFilters(defaults) {
    const filters = GM_getValue('filters');

    if (!filters) {
      // We need to setup the defaults
      GM_setValue('filters', defaults);
      return defaults;
    }

    return filters;
  }

  static saveFilters() {
    const options = Filter.fromElements();
    const modifiedOptions = Object.assign({}, defaults, options);
    GM_setValue('filters', modifiedOptions);
  }
}

class Utilities {
  static getUserIdfromLink(link) {
    const re = new RegExp('ID=(\\d+)');
    const idMatch = re.exec(link);
    if (idMatch !== null) return idMatch[1];

    return undefined;
  }
}

class MemberRow {
  constructor(rowElement) {
    this.element = rowElement;
    this.isIdle = rowElement.find(`div[id*=${selectors.idle}-user]`).length > 0;
    this.isOffline = rowElement.find(`div[id*=${selectors.offline}-user]`).length > 0;
    this.isOnline = rowElement.find(`div[id*=${selectors.online}-user]`).length > 0;
    this.isOkay = rowElement.find(`:contains("${statuses.okay}")`).length > 0;
    this.isHospital = rowElement.find(`:contains("${statuses.hospital}")`).length > 0;
    this.isTraveling = rowElement.find(`:contains("${statuses.traveling}")`).length > 0;
    this.isInJail = rowElement.find(`:contains("${statuses.jail}")`).length > 0;
  }

  get userid() {
    return Utilities.getUserIdfromLink(this.element.find("a[href*='profiles.php']").attr('href'));
  }

  get name() {
    return this.element.find("a[href*='profiles.php']").find('span[class^=searchText]').text();
  }

  get status() {
    if (this.isHospital) return statuses.hospital;
    if (this.isTraveling) return statuses.traveling;
    if (this.isInJail) return statuses.jail;
    if (this.isOkay) return statuses.okay;
  }

  get presence() {
    if (this.isIdle) return 'Idle';
    if (this.isOffline) return 'Offline';
    if (this.isOnline) return 'Online';
  }

  checkVisibility(filter, disabled) {
    log.append(`checking visibility with filter ${JSON.stringify(filter)}`);
    const fArray = filter.getFilterArray();
    log.append(`Filter array is ${fArray.join(', ')}`);
    const checks = [
      false,
      this.userid in disabled,
      fArray.includes(this.status),
      fArray.includes(this.presence)
    ];

    log.append(`Check results are: ${checks.join(', ')}`);

    if (checks.some((element) => element === true)) {
      this.element.hide();
      return;
    }

    this.element.show();
  }
}

class WarView {
  static async toggleByIcons(iconSelector) {
    const rows = WarView.getRowsWithIcon(iconSelector);
    WarView.toggleRows(rows);
  }

  static async toggleByStatus(status) {
    const rows = WarView.getRowsWithStatus(status);
    WarView.toggleRows(rows);
  }

  static toggleRows(rows) {
    const filter = Filter.fromElements();
    const disabled = Storage.get() || {};
    rows.each((i, r) => {
      const row = new MemberRow($(r));
      row.checkVisibility(filter, disabled);
    });
  }

  static getHospitalRows() {
    return $(`${selectors.memberRow} > li:contains("Hospital")`);
  }

  static getRowsWithStatus(status) {
    return $(`${selectors.memberRow} > li:contains("${status}")`);
  }

  static getRowsWithIcon(iconSelector) {
    return $(selectors.memberRow).find(`div[id*=${iconSelector}-user]`).parents('li.enemy');
  }

  static async process(options) {
    const rows = $(`${selectors.memberRow} > li`);
    const filter = Filter.fromElements();
    const disabled = Storage.get() || {};

    rows.each((i, j) => {
      const row = new MemberRow($(j));
      row.checkVisibility(filter, disabled);
    });
  }
}

class Filter {
  static fromElements() {
    const options = new Filter();

    options.hideIdle = $('#tcw-idle').is(':checked');
    options.hideOffline = $('#tcw-offline').is(':checked');
    options.hideOnline = $('#tcw-online').is(':checked');
    options.hideTraveling = $('#tcw-traveling').is(':checked');
    options.hideJail = $('#tcw-jail').is(':checked');
    options.hideOkay = $('#tcw-okay').is(':checked');
    options.hideHospital = $('#tcw-hospital').is(':checked');

    return options
  }

  getFilterArray() {
    const result = [];
    Object.keys(this).forEach((k) => {
      if (this[k]) result.push(k.substr(4));
    });

    return result;
  }
}
class WarUI {
  static controls(parentSelector, options) {
    const membersParent = $(parentSelector);
    if ($('#tcw-controls')[0] != undefined) return;

    const controlsDiv = $(`
      <div id="tcw-controls" class="faction-info-wrap another-faction" style="display: grid;">
        <div class="title-black top-round m-top10">Faction War - Filters</div>
        <div class="faction-info bottom-round" style="padding: 10px;">
          <div style="width: 70%; float: left;">
          <p>
              <input type="checkbox" id="tcw-idle" name="tcw-idle" ${options.hideIdle ? 'checked' : ''}>
              <label for="tcw-idle">Hide Idle</label>
              <input type="checkbox" id="tcw-offline" name="tcw-offline" ${options.hideOffline ? 'checked' : ''}>
              <label for="tcw-offline">Hide Offline</label>
              <input type="checkbox" id="tcw-online" name="tcw-online" ${options.hideOnline ? 'checked' : ''}>
              <label for="tcw-online">Hide Online</label>
            </p>
            <p>
              <input type="checkbox" id="tcw-traveling" name="tcw-traveling" ${options.hideTraveling ? 'checked' : ''}>
              <label for="tcw-traveling">Hide Traveling</label>
              <input type="checkbox" id="tcw-jail" name="tcw-jail" ${options.hideJail ? 'checked' : ''}>
              <label for="tcw-jail">Hide Jailed</label>
              <input type="checkbox" id="tcw-okay" name="tcw-okay" ${options.hideOkay ? 'checked' : ''}>
              <label for="tcw-okay">Hide Okay</label>
              <input type="checkbox" id="tcw-hospital" name="tcw-hospital" ${options.hideHospital ? 'checked' : ''}>
              <label for="tcw-hospital">Hide Hospital</label>
            </p>
            <p style="margin-top: 10px;">
              Hidden Enemies <span id="tcw-hiddencount"></span>
              <div id="tcw-filteredusers" style="width: 300px; height: 100px; overflow-y: scroll; background-color: black; border: 1px solid gray;">
              
              </div>
              <p>
                  <button type="button" id="tcw-clearhidden">Clear All</button>
              </p>
            </p>    
          </div>
          <div style="float: right;">
            <button type="button" id="tcw-refresh" style=>Refresh</button>
          </div>
        </div>
      </div>
    `);
    membersParent.before(controlsDiv);
    WarUI.RefreshHiddenUsers();

    // Add the filter button on each row
    $(`${selectors.memberRow}`).find('div[class^=level]').each((index, element) => { $(element).append('<button class="tcw-filter" type="button" style="width: 20%;float: left;margin-top: 10%;">&#128065</button>')});
    $('#tcw-clearhidden').on('click', () => WarUI.RemoveAllHidden());
    $('.tcw-filter').on('click', (event) => addToWarFilter($(event.currentTarget).closest('li')));
    $('#tcw-refresh').on('click', () => window.location.reload());
    $('#tcw-idle').on('click', () => WarView.toggleByIcons(selectors.idle));
    $('#tcw-offline').on('click', () => WarView.toggleByIcons(selectors.offline));
    $('#tcw-online').on('click', () => WarView.toggleByIcons(selectors.online));
    $('#tcw-traveling').on('click', () => WarView.toggleByStatus('Traveling'));
    $('#tcw-jail').on('click', () => WarView.toggleByStatus('Jail'));
    $('#tcw-okay').on('click', () => WarView.toggleByStatus('Okay'));
    $('#tcw-hospital').on('click', () => WarView.toggleByStatus('Hospital'));
    $('#tcw-controls').on('click', () => Storage.saveFilters());
  }

  static RemoveAllHidden() {
    Storage.remove()
    WarUI.RefreshHiddenUsers();
  }

  static RefreshHiddenUsers() {
    // Create the list of filtered users to show inside the corresponding div
    const disabled = Storage.get();

    $('#tcw-filteredusers').empty();
    for (let [key, value] of Object.entries(disabled)) {
      let element = $(`<p>${value} [${key}]<button class="tcw-hiddenremove" type="button">Remove</button></p>`);
      $('#tcw-filteredusers').append(element);
      element.find('button').on('click', () => {
        Storage.remove(key);
        WarUI.RefreshHiddenUsers();
      });
    }

    $('#tcw-hiddencount').text(Object.keys(disabled).length);

    let options = Storage.getFilters(defaults);
    WarView.process(options);
  }
}

function warWatcher() {
  const target = $('#faction-main')[0];
  const observer = new MutationObserver((mutations, observer) => {
    mutations.forEach((record) => {
      if (record.addedNodes.length > 0 && (record.target.nodeName == 'UL' && record.target.className.includes('f-war-list')) || (record.target.nodeName == 'DIV' && record.target.innerHTML.includes('f-war-list'))) {
        (function searchElement() {
          if ($('div.enemy-faction').length == 0) {
            setTimeout(() => {
              searchElement();
            }, 1000);
          } else {
            // Added the war list, add ui and filter
            let options = Storage.getFilters(defaults);
            WarUI.controls('div.enemy-faction', options);
            WarView.process(options);
          }
        })();
      } else if (record.removedNodes.length > 0 && record.target.parentElement.nodeName == 'LI' && record.target.className.includes('attack')) {
        // Potential update in a a row, re-evaluate visibility
        let options = Storage.getFilters(defaults);
        WarView.process(options)
      }
    });
  });

  observer.observe(target, {
    subtree: true,
    childList: true,
  });
}

log = new MobileLogWindow();

warWatcher();
