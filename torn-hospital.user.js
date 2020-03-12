// ==UserScript==
// @name Faction Hospital - Edited (Also hides offliners)
// @namespace http://tampermonkey.net/
// @version 2.3.0
// @description Shows only faction members that are in the hospital and online, and hides the rest.
// @author Goltred and Reborn121 - Heavily modified version from muffenman's (help by Pi77Bull)
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-hospital.user.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-hospital.user.js
// @match https://www.torn.com/factions.php?step=profile&ID=*
// @match https://www.torn.com/profiles.php?XID=*
// @grant GM_setValue
// @grant GM_getValue
// @run-at document-end
// ==/UserScript==

// What does this script do?
// It hides all members on faction pages that are not in the hospital and displays the hospital time for those who are.

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
  threshold: 60 //> Members in the hospital for less than this value in minutes will be hidden.
};

// Setup listeners
$(document).ajaxComplete((evt, xhr, settings) => {
  if (settings.url.includes('profiles.php?step=getProfileData') && ($("a.profile-button.profile-button-revive.cross.disabled").length > 0)) {
    const { user } = JSON.parse(xhr.responseText);
    Storage.append(user.userID);
  }
});

class Storage {
  static async append(profileId) {
    let disabled = GM_getValue('disabled');
    const timestamp = Date.now();

    // we add a new record in the format of { 12345: unixtimestamp }
    if (!disabled)
      disabled = {}

    disabled[profileId] = timestamp;
    GM_setValue('disabled', disabled);
  }

  static get(profileId) {
    const disabled = GM_getValue('disabled');

    if (disabled) {
      if (profileId && profileId in disabled) return disabled[profileId]

      return disabled;

    }
  }

  static purgeOld(timeout = 300000) {
    const disabled = GM_getValue('disabled');
    const timestamp = Date.now();

    if (disabled) {
      const filtered = {};
      Object.keys(disabled).forEach(k => {
        if (timestamp < disabled[k] + timeout)
          filtered[k] = disabled[k];
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
    const options = Options.getOptions();
    const modifiedOptions = Object.assign({}, defaults, options);
    GM_setValue('filters', modifiedOptions);
  }
}

class MemberRow {
  constructor(rowElement) {
    this.element = rowElement;
    this.isIdle = rowElement.find(HospitalUI.selectors.idle).length > 0;
    this.isOffline = rowElement.find(HospitalUI.selectors.offline).length > 0;
    this.isOnline = rowElement.find(HospitalUI.selectors.online).length > 0;
    this.isOkay = rowElement.find(`:contains("${HospitalUI.statuses.okay}")`).length > 0;
    this.isHospital = rowElement.find(`:contains("${HospitalUI.statuses.hospital}")`).length > 0;
    this.isTraveling = rowElement.find(`:contains("${HospitalUI.statuses.traveling}")`).length > 0;
    this.isInJail = rowElement.find(`:contains("${HospitalUI.statuses.jail}")`).length > 0;
  }

  get hospitalTime() {
    const hospTitle = this.element.find(HospitalUI.selectors.hospital).attr("title");
    const titleElement = $(hospTitle);
    // get the timer and grab the data-time attribute
    const seconds = parseInt(titleElement.filter('span.timer').attr('data-time'));
    if (seconds && seconds >= 0) return {
      hours: Number(seconds / 60 / 60),
      minutes: Number(seconds / 60),
      seconds
    };

    return undefined;
  }

  get id() {
    const re = new RegExp('XID=(?<id>\\d+)');
    const idMatch = re.exec(this.element.find("a[href*='profiles.php']").attr('href'));
    if (idMatch !== null) return idMatch.groups.id;

    return undefined;
  }

  get status() {
    if (this.isHospital) return HospitalUI.statuses.hospital;
    if (this.isTraveling) return HospitalUI.statuses.traveling;
    if (this.isInJail) return HospitalUI.statuses.jail;
    if (this.isOkay) return HospitalUI.statuses.okay;
  }

  get presence() {
    if (this.isIdle) return 'Idle';
    if (this.isOffline) return 'Offline';
    if (this.isOnline) return 'Online';
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
    const rows = $('.member-list').find(iconSelector).parents('li');
    const filter = Options.getFilterArray();
    rows.each((i, r) => {
      const row = new MemberRow($(r));
      if (filter.includes(row.status) || filter.includes(row.presence)) return row.element.hide();
      row.element.show();
    });
  }

  static async toggleByStatus(status) {
    const rows = $(`.member-list > li:contains("${status}")`);
    const filter = Options.getFilterArray();
    rows.each((i, r) => {
      const row = new MemberRow($(r));
      if (filter.includes(row.status) || filter.includes(row.presence)) return row.element.hide();
      row.element.show();
    });
  }

  static async toggleRevivesOff() {
    // get members that have been detected with revives off
    const disabled = Storage.get() || {};

    if (Object.keys(disabled) > 0) {
      const filter = Options.getFilterArray();

      const rows = $('.member-list > li:contains("Hospital")');
      rows.each((i, j) => {
        const row = new MemberRow($(j));
        if ((row.id && Object.keys(disabled).includes(row.id)) || (row.hospitalTime && row.hospitalTime.minutes < filterTime) || filter.includes(row.status) || filter.includes(row.presence))
          return row.element.hide();

        row.element.show();
      });
    }
  }

  static async toggleHospitalByThreshold(threshold = 0) {
    const rows = $('.member-list > li:contains("Hospital")');
    const filter = Options.getFilterArray();
    const filterOptions = Options.getOptions();
    const filterTime = filterOptions.hideThreshold || threshold;
    rows.each((i, j) => { //loops through every member that is in hospital
      const row = new MemberRow($(j));

      if ((row.hospitalTime && row.hospitalTime.minutes < filterTime) || filter.includes(row.status) || filter.includes(row.presence))
        return row.element.hide();

      row.element.show();
    });
  }

  static async updateHospitalTime() {
    $('.member-list > li:contains("Hospital")').each((i, j) => { //loops through every member that is in hospital
      const hospTitle = $(j).find("[id^=icon15__]").attr("title");
      $(j).find(".days").text(hospTitle.substr(-16, 8)); //displays time that is found in the hospital icon
    });
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
    setTimeout(() => toggleWalls(hide), 50);
  }

  static async process(options) {
    await FactionView.repositionMemberList();
    $(".title .days").text("Days/Time");
    FactionView.toggleByStatus('Traveling'); // Hide people Traveling
    FactionView.toggleByStatus('Jail'); // Hide people in Jail
    FactionView.toggleByStatus('Okay'); // Hide people that are Okay
    FactionView.toggleByIcons(HospitalUI.selectors.idle);
    FactionView.toggleByIcons(HospitalUI.selectors.offline);
    FactionView.toggleHospitalByThreshold(options.hideThreshold);
    FactionView.updateHospitalTime();
    //FactionView.toggleRevivesOff(options.hideRevivesOff);
    FactionView.toggleDescription(options.hideDescription);
    FactionView.toggleWalls(options.hideWalls);
  }
}

class Options {
  static getOptions() {
    return {
      hideIdle: $('#tch-idle').is(':checked'),
      hideOffline: $('#tch-offline').is(':checked'),
      hideOnline: $('#tch-online').is(':checked'),
      hideDescription: $('#tch-description').is(':checked'),
      hideWalls: $('#tch-walls').is(':checked'),
      hideTraveling: $('#tch-traveling').is(':checked'),
      hideJail: $('#tch-jail').is(':checked'),
      hideOkay: $('#tch-okay').is(':checked'),
      hideHospital: $('#tch-hospital').is(':checked'),
      hideRevivesOff: $('#tch-revoff').is(':checked'),
      hideThreshold: parseInt($('#tch-threshold').val())
    };
  }

  static getFilterArray() {
    const options = Options.getOptions();
    const result = [];
    Object.keys(options).forEach((k) => {
      if (options[k]) result.push(k.substr(4));
    });

    return result;
  }
}

class HospitalUI {
  static selectors = {
    idle: '[id^=icon62__]',
    offline: '[id^=icon2__]',
    hospital: '[id^=icon15__]',
    online: '[id^=icon1__]'
  };

  static statuses = {
    okay: 'Okay',
    hospital: 'Hospital',
    jail: 'Jail',
    traveling: 'Traveling',
    mugged: 'Mugged'
  }

  static controls(options) {
    const membersParent = $('div.f-war-list').parent();
    const controlsDiv = $(`
      <div id="tch-controls" class="faction-info-wrap another-faction">
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
    $('#tch-idle').on('click', () => FactionView.toggleByIcons(HospitalUI.selectors.idle));
    $('#tch-offline').on('click', () => FactionView.toggleByIcons(HospitalUI.selectors.offline));
    $('#tch-online').on('click', () => FactionView.toggleByIcons(HospitalUI.selectors.online));
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
if (document.URL.includes('factions.php')) {
  const filters = Storage.getFilters(defaults);

  FactionView.process(filters);
  HospitalUI.controls(filters);
}
