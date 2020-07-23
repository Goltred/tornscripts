// ==UserScript==
// @name Torn Faction Filter
// @namespace https://github.com/Goltred/tornscripts
// @version 3.0.6
// @description Shows only faction members that are in the hospital and online, and hides the rest.
// @author Goltred and Reborn121
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-hospital.user.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-hospital.user.js
// @match https://www.torn.com/factions.php*
// @match https://www.torn.com/profiles.php?XID=*
// @match https://www.torn.com/hospitalview.php*
// @grant GM_setValue
// @grant GM_getValue
// @run-at document-end
// ==/UserScript==

// Configuration values
const defaults = {
  hideWalls: true,
  hideIdle: true,
  hideOffline: true,
  hideOnline: false,
  hideDescription: true,
  hideJail: true,
  hideOkay: true,
  hideTraveling: true,
  hideHospital: false,
  hideThreshold: 60 //> Members in the hospital for less than this value in minutes will be hidden.
};

const selectors = {
  idle: '[id^=icon62__]',
  offline: '[id^=icon2__]',
  hospital: '[id^=icon15__]',
  online: '[id^=icon1__]',
  memberRow: '.members-list > .table-body'
};

const statuses = {
  okay: 'Okay',
  hospital: 'Hospital',
  jail: 'Jail',
  traveling: 'Traveling',
  mugged: 'Mugged'
};

let log;

// Setup listeners
$(document).ajaxComplete((evt, xhr, settings) => {
  if (settings.url.includes('profiles.php?step=getProfileData') && ($("a.profile-button.profile-button-revive.cross.disabled").length > 0)) {
    const { user } = JSON.parse(xhr.responseText);
    Storage.append(user.userID);
  } else if (settings.url.includes('factions.php') && settings.data === 'step=info') {
    // This is when the faction description is filled for the player faction, info tab
    FactionView.removeDescriptionScrollbar();
  }
});

class MobileLogWindow {
  constructor(show = false) {
    if (show) this.showUI();
  }

  showUI() {
    if ($('#tchf-log').length === 0) {
      const el = $(`
      <div style="background-color: lightyellow;">
      <p style="padding-bottom: 5px;"><strong>Torn Hospital Log Window</strong></p>
      <div id="tchf-log" style="max-height:100px; overflow-y: scroll;"></div>
      `);
      $('#factions').before(el);
    }
  }

  append(msg) {
    $('#tchf-log').append(`<p>${msg}</p>`);
  }
}

class Storage {
  static async append(profileId) {
    let disabled = GM_getValue('disabled');
    const timestamp = Date.now();

    // we add a new record in the format of { 12345: unixtimestamp }
    if (!disabled) disabled = {};

    disabled[profileId] = timestamp;
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

  static purgeOld(timeout = 300000) {
    const disabled = GM_getValue('disabled');
    const timestamp = Date.now();

    if (disabled) {
      const filtered = {};
      Object.keys(disabled).forEach(k => {
        if (timestamp < disabled[k] + timeout) filtered[k] = disabled[k];
      });
      GM_setValue('disabled', filtered);
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

class MemberRow {
  constructor(rowElement) {
    this.element = rowElement;
    this.isIdle = rowElement.find(selectors.idle).length > 0;
    this.isOffline = rowElement.find(selectors.offline).length > 0;
    this.isOnline = rowElement.find(selectors.online).length > 0;
    this.isOkay = rowElement.find(`:contains("${statuses.okay}")`).length > 0;
    this.isHospital = rowElement.find(`:contains("${statuses.hospital}")`).length > 0;
    this.isTraveling = rowElement.find(`:contains("${statuses.traveling}")`).length > 0;
    this.isInJail = rowElement.find(`:contains("${statuses.jail}")`).length > 0;
  }

  get hospitalTime() {
    const hospTitle = this.element.find(selectors.hospital).attr("title");
    const titleElement = $(hospTitle);
    // get the timer and grab the data-time attribute
    const seconds = parseInt(titleElement.filter('span.timer').attr('data-time'));
    if (seconds && seconds >= 0) {
      return {
        hours: Number(seconds / 60 / 60),
        minutes: Number(seconds / 60),
        seconds
      };
    }

    return undefined;
  }

  get userid() {
    const re = new RegExp('XID=(\\d+)');
    const idMatch = re.exec(this.element.find("a[href*='profiles.php']").attr('href'));
    if (idMatch !== null) return idMatch[1];

    return undefined;
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
    const filterTime = filter.hideThreshold || defaults.hideThreshold;
    log.append(`Filter time is ${filterTime}`);
    const checks = [
      false, this.userid && Object.keys(disabled).includes(this.userid) && fArray.includes("RevivesOff"),
      (this.hospitalTime && this.hospitalTime.minutes < filterTime) || false,
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

class FactionView {
  static async repositionMemberList() {
    const membersDiv = $('.f-war-list.m-top10');
    const fInfo = $('.faction-info');
    fInfo.parent().after(membersDiv.parent());
  }

  static async toggleDescription(hide) {
    if (hide) {
      $(".faction-title").hide();
      $(".faction-description").hide();
      return;
    }

    $(".faction-title").show();
    $(".faction-description").show();
  }

  static async toggleByIcons(iconSelector) {
    const rows = FactionView.getRowsWithIcon(iconSelector);
    FactionView.toggleRows(rows);
  }

  static async toggleByStatus(status) {
    const rows = FactionView.getRowsWithStatus(status);
    FactionView.toggleRows(rows);
  }

  static toggleRows(rows) {
    const filter = Filter.fromElements();
    const disabled = Storage.get() || {};
    rows.each((i, r) => {
      const row = new MemberRow($(r));
      row.checkVisibility(filter, disabled);
    });
  }

  static async toggleRevivesOff() {
    // get members that have been detected with revives off
    const disabled = Storage.get() || {};

    if (Object.keys(disabled).length > 0) {
      const rows = FactionView.getHospitalRows();
      FactionView.toggleRows(rows);
    }
  }

  static async toggleHospitalByThreshold() {
    const rows = FactionView.getHospitalRows();
    this.toggleRows(rows);
  }

  static async updateHospitalTime() {
    $(' > li:contains("Hospital")').each((i, j) => {
      const hospTitle = $(j).find("[id^=icon15__]").attr("title");
      $(j).find(".days").text(hospTitle.substr(-16, 8));
    });
  }

  static getHospitalRows() {
    return $(`${selectors.memberRow} > li:contains("Hospital")`);
  }

  static getRowsWithStatus(status) {
    return $(`${selectors.memberRow} > li:contains("${status}")`);
  }

  static getRowsWithIcon(iconSelector) {
    return $(selectors.memberRow).find(iconSelector).parents('li');
  }

  static async toggleWalls(hide) {
    // There doesn't seem to be an XHR request being sent for this...
    // Hide faction walls
    let el = $("#war-react-root");
    if (el.length > 0) {
      if (hide) {
        $('ul.f-war-list').parent().hide();
        el.hide();
        return;
      }

      $('ul.f-war-list').parent().show();
      el.show();
      return;
    }
    setTimeout(() => this.toggleWalls(hide), 50);
  }

  static removeAnnouncementScrollbar() {
    $(".cont-gray10").attr('style', '');
  }

  static removeDescriptionScrollbar() {
    $('div.faction-description').attr('style', 'max-height: 100%; overflow: hidden !important');
  }

  static async process(options) {
    await FactionView.repositionMemberList();
    $(".title .days").text("Days/Time");

    FactionView.removeDescriptionScrollbar();

    const rows = $(`${selectors.memberRow} > li`);
    const filter = Filter.fromElements();
    const disabled = Storage.get() || {};

    rows.each((i, j) => {
      const row = new MemberRow($(j));
      row.checkVisibility(filter, disabled);
    });

    FactionView.updateHospitalTime();
    FactionView.toggleDescription(options.hideDescription);
    FactionView.toggleWalls(options.hideWalls);
  }
}

class Filter {
  static fromElements() {
    const options = new Filter();

    options.hideIdle = $('#tch-idle').is(':checked');
    options.hideOffline = $('#tch-offline').is(':checked');
    options.hideOnline = $('#tch-online').is(':checked');
    options.hideDescription = $('#tch-description').is(':checked');
    options.hideWalls = $('#tch-walls').is(':checked');
    options.hideTraveling = $('#tch-traveling').is(':checked');
    options.hideJail = $('#tch-jail').is(':checked');
    options.hideOkay = $('#tch-okay').is(':checked');
    options.hideHospital = $('#tch-hospital').is(':checked');
    options.hideRevivesOff = $('#tch-revoff').is(':checked');
    options.hideThreshold = parseInt($('#tch-threshold').val());

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
class HospitalUI {
  static controls(options) {
    const membersParent = $('div.f-war-list').parent();
    const controlsDiv = $(`
      <div id="tch-controls" class="faction-info-wrap another-faction" style="display: grid;">
        <div class="title-black top-round m-top10">Torn Hospital - Filters</div>
        <div class="faction-info bottom-round" style="padding: 10px;">
          <div style="width: 70%; float: left;">
          <p>
              <input type="checkbox" id="tch-idle" name="tch-idle" ${options.hideIdle ? 'checked': ''}>
              <label for="tch-idle">Hide Idle</label>
              <input type="checkbox" id="tch-offline" name="tch-offline" ${options.hideOffline ? 'checked': ''}>
              <label for="tch-offline">Hide Offline</label>
              <input type="checkbox" id="tch-online" name="tch-online" ${options.hideOnline ? 'checked': ''}>
              <label for="tch-online">Hide Online</label>
            </p>
            <p>
              <label for="tch-threshold">Hospital Time Threshold (minutes)</label>
              <input type="number" id="tch-threshold" name="tch-threshold" value="${options.hideThreshold}">
            </p>
            <p>
              <input type="checkbox" id="tch-traveling" name="tch-traveling" ${options.hideTraveling ? 'checked': ''}>
              <label for="tch-traveling">Hide Traveling</label>
              <input type="checkbox" id="tch-jail" name="tch-jail" ${options.hideJail ? 'checked': ''}>
              <label for="tch-jail">Hide Jailed</label>
              <input type="checkbox" id="tch-okay" name="tch-okay" ${options.hideOkay ? 'checked': ''}>
              <label for="tch-okay">Hide Okay</label>
              <input type="checkbox" id="tch-hospital" name="tch-hospital" ${options.hideHospital ? 'checked': ''}>
              <label for="tch-hospital">Hide Hospital</label>
            </p>
            <p>
              <input type="checkbox" id="tch-description" name="tch-description" ${options.hideDescription ? 'checked': ''}>
              <label for="tch-description">Hide Description</label>
              <input type="checkbox" id="tch-walls" name="tch-walls" ${options.hideWalls ? 'checked': ''}>
              <label for="tch-walls">Hide Walls</label>
              <input type="checkbox" id="tch-revoff" name="tch-revoff" ${options.hideRevivesOff ? 'checked': ''}>
              <label for="tch-revoff">Hide Revives Off</label>
            </p>
          </div>
          <div style="float: right;">
            <button type="button" id="tch-refresh" style=>Refresh</button>
          </div>
        </div>
      </div>
    `);
    membersParent.before(controlsDiv);
    $('#tch-refresh').on('click', () => window.location.reload());
    $('#tch-idle').on('click', () => FactionView.toggleByIcons(selectors.idle));
    $('#tch-offline').on('click', () => FactionView.toggleByIcons(selectors.offline));
    $('#tch-online').on('click', () => FactionView.toggleByIcons(selectors.online));
    $('#tch-description').on('click', () => FactionView.toggleDescription($('#tch-description').is(':checked')));
    $('#tch-walls').on('click', () => FactionView.toggleWalls($('#tch-walls').is(':checked')));
    $('#tch-traveling').on('click', () => FactionView.toggleByStatus('Traveling'));
    $('#tch-jail').on('click', () => FactionView.toggleByStatus('Jail'));
    $('#tch-okay').on('click', () => FactionView.toggleByStatus('Okay'));
    $('#tch-hospital').on('click', () => FactionView.toggleByStatus('Hospital'));
    $('#tch-threshold').on('keyup', () => FactionView.toggleHospitalByThreshold());
    $('#tch-threshold').on('blur', () => Storage.saveFilters());
    $('#tch-revoff').on('click', () => FactionView.toggleRevivesOff());
    $('#tch-controls').on('click', () => Storage.saveFilters());
  }
}

// Clear any records of players with disabled revives if the timeout has been met
Storage.purgeOld();

// Modify the faction view
if (document.URL.includes('factions.php?step=your')) {
  // Remove the pesky scrollbar from faction announcement
  FactionView.removeAnnouncementScrollbar();
} else if (document.URL.includes('factions.php')) {
  const filters = Storage.getFilters(defaults);

  FactionView.process(filters);
  HospitalUI.controls(filters);
  log = new MobileLogWindow(false);
}
