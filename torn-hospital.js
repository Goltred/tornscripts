// ==UserScript==
// @name Faction Hospital - Edited (Also hides offliners)
// @namespace http://tampermonkey.net/
// @version 2.1.0
// @description Shows only faction members that are in the hospital and online, and hides the rest.
// @author muffenman and help from Pi77Bull - Modified by Goltred & Reborn121
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-hospital.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-hospital.js
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
  hideDescription: true,
  threshold: 1 //> Members in the hospital for less than this value in hours will be hidden.
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

  static saveFilters(options) {
    const modifiedOptions = Object.assign({}, defaults, options);
    GM_setValue('filters', modifiedOptions);
  }
}

class FactionView {
  static async repositionMemberList() {
    const membersDiv = $('.f-war-list.m-top10');
    const fInfo = $('.faction-info');
    fInfo.parent().after(membersDiv.parent());
  }

  static async toggleDescription(hide) {
    $(".faction-title").css("display", hide ? 'none' : ''); //hides faction title
    $( ".faction-description" ).css("display", hide ? 'none' : '', "traveling"); //hides faction description
  }

  static async toggleOffline(hide) {
    const rows = $('.member-list #icon2').parents("li");
    if (hide)
      rows.hide();
    else
      rows.show();
  }

  static async toggleIdle(hide) {
    const rows = $('.member-list #icon62').parents("li");
    if (hide)
      rows.hide();
    else
      rows.show();
  }

  static async changeMembers(threshold = 1) {
    $('.member-list > li:not(:contains("Hospital"))').css("display", "none"); //hides every member that is not in hospital

    // get members that have been detected with revives off
    const disabled = Storage.get() || {};

    $('.member-list > li:contains("Hospital")').each((i, j) => { //loops through every member that is in hospital
      // Hide revives off people
      const re = new RegExp('XID=(?<id>\\d+)');
      const idMatch = re.exec($(j).find("a[href*='profiles.php']").attr('href'));
      if (idMatch !== null && Object.keys(disabled).includes(idMatch.groups.id)) {
        $(j).css('display', 'none');
      } else {
        $(j).find(".days").text($(j).find("#icon15").attr("title").substr(-16, 8)); //displays time that is found in the hospital icon

        //> Hide members in the hospital for less than threshold.
        var hours = Number($(j).find("#icon15").attr("title").substr(-16, 2));
        if (hours < threshold) {
          $(j).css("display", "none");
        }

        $(".title .days").text("Time"); //changes Days column title to "Time"
      }
    });
  }

  static async toggleWalls(hide) {
    // There doesn't seem to be an XHR request being sent for this...
    // Hide faction walls
    let el = $("#war-react-root");
    if (el.length > 0) {
      $('ul.f-war-list').parent().css('display', hide ? 'none' : '');
      el.css("display", hide ? "none" : '');
      return;
    }
    setTimeout(() => toggleWalls(hide), 50);
  }

  static async process(options) {
    FactionView.changeMembers(options.threshold);

    await FactionView.repositionMemberList();
    FactionView.toggleOffline(options.hideOffline);
    FactionView.toggleIdle(options.hideIdle);
    FactionView.toggleDescription(options.hideDescription);
    FactionView.toggleWalls(options.hideWalls);
  }
}

class HospitalUI {
  static controls(options) {
    const membersParent = $('div.f-war-list').parent();
    const controlsDiv = $(`
      <div id="tch-controls" class="faction-info-wrap another-faction">
        <div class="title-black top-round m-top10">Torn Hospital - Filters</div>
        <div class="faction-info bottom-round" style="padding: 10px;">
          <div style="width: 70%; float: left;">
            <input type="checkbox" id="tch-idle" name="tch-idle" ${options.hideIdle ? 'checked': ''}>
            <label for="tch-idle">Hide Idle</label>
            <input type="checkbox" id="tch-offline" name="tch-offline" ${options.hideOffline ? 'checked': ''}>
            <label for="tch-offline">Hide Offline</label>
            <input type="checkbox" id="tch-description" name="tch-description" ${options.hideDescription ? 'checked': ''}>
            <label for="tch-description">Hide Description</label>
            <input type="checkbox" id="tch-walls" name="tch-walls" ${options.hideWalls ? 'checked': ''}>
            <label for="tch-walls">Hide Walls</label>
          </div>
          <div style="float: right;">
            <button type="button" id="tch-refresh" style=>Refresh</button>
          </div>
        </div>
      </div>
    `);
    membersParent.before(controlsDiv);
    $('#tch-refresh').on('click', () => window.location.reload());
    $('#tch-idle').on('click', () => FactionView.toggleIdle($('#tch-idle').is(':checked')));
    $('#tch-offline').on('click', () => FactionView.toggleOffline($('#tch-offline').is(':checked')));
    $('#tch-description').on('click', () => FactionView.toggleDescription($('#tch-description').is(':checked')));
    $('#tch-walls').on('click', () => FactionView.toggleWalls($('#tch-walls').is(':checked')));
    $('#tch-controls .filters').on('click', () => Storage.saveFilters({
      hideIdle: $('#tch-idle').is(':checked'),
      hideOffline: $('#tch-offline').is(':checked'),
      hideDescription: $('#tch-description').is(':checked'),
      hideWalls: $('#tch-walls').is(':checked')
    }));
  }
}

// Clear any records of players with disabled revives if the timeout has been met
Storage.purgeOld();

// Modify the faction view
if (document.URL.includes('factions.php')) {
  const filters = Storage.getFilters(defaults);

  FactionView.process(filters);

  HospitalUI.controls(filters);
  //console.log("Made by muffenman [2002712] and Pi77Bull [2082618] . If you like it, send us a message or a gift either is fine :P \"I love your script!\".");
}
