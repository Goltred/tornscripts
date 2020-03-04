// ==UserScript==
// @name Faction Hospital - Edited (Also hides offliners)
// @namespace http://tampermonkey.net/
// @version 2.0.1
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
}
class FactionView {
  static async repositionMemberList() {
    const warList = $('.f-war-list').parent();
    const fInfo = $('.faction-info');
    fInfo.parent().after(warList);
  }

  static async hideDescription() {
    $(".faction-title").css("display", 'none'); //hides faction title
    $( ".faction-description" ).css("display", "none", "traveling"); //hides faction description
  }

  static async hideOffline() {
    $('.member-list #icon2').parents("li").hide();
  }

  static async hideIdle() {
    $('.member-list #icon62').parents("li").hide();
  }

  static async changeMembers(threshold = 1) {
    $('.member-list > li:not(:contains("Hospital"))').css("display", "none"); //hides every member that is not in hospital

    // get members that have been detected with revives off
    const disabled = Storage.get();

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

  static async hideWalls() {
    // There doesn't seem to be an XHR request being sent for this...
    let wallsCheck = setInterval(() => {
      // Hide faction walls
      let el = $("#war-react-root");
      if (el.length > 0) {
          clearInterval(wallsCheck);
          $('ul.f-war-list').parent().css('display', 'none');
          el.css("display", "none");
      }
    }, 50);
  }
}

// Clear any records of players with disabled revives if the timeout has been met
Storage.purgeOld();

// Modify the faction view
if (document.URL.includes('factions.php')) {
  // Configuration values
  const hideWalls = true;
  const hideIdle = true;
  const hideOffline = true;
  const hideDescription = true;
  const threshold = 1; //> Members in the hospital for less than this value in hours will be hidden.

  FactionView.changeMembers(threshold);

  FactionView.repositionMemberList().then(() => {
    if (hideOffline) FactionView.hideOffline();
    if (hideIdle) FactionView.hideIdle();
    if (hideDescription) FactionView.hideDescription();
    if (hideWalls) FactionView.hideWalls();
  });
  //console.log("Made by muffenman [2002712] and Pi77Bull [2082618] . If you like it, send us a message or a gift either is fine :P \"I love your script!\".");
}
