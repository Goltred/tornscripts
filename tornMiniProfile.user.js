    // ==UserScript==
    // @name Torn Mini profile link
    // @namespace https://github.com/Goltred/tornscripts
    // @version 1.0.0
    // @description Adds a link to trigger a mini profile of the related member in faction view
    // @author Goltred
    // @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornMiniProfileLink.user.js
    // @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornMiniProfileLink.user.js
    // @match https://www.torn.com/factions.php*
    // @run-at document-end
    // ==/UserScript==

    class TornMiniProfile {
      static userNameSelector = 'a[href*=\'profiles.php?XID=\']';

      constructor(userID) {
        this.userID = userID;
      }

      static openProfile(evt) {
        const userNameLink = $(evt.target).closest('li').find(TornMiniProfile.userNameSelector);
        let mousedown = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: evt.clientX,
          clientY: evt.clientY
        });
        userNameLink[0].dispatchEvent(mousedown);
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

    const rows = $('.member-list > li');
    const locationSelector = getUserDevice() === 'desktop' ? 'div.status' : 'div.member.icons';
    rows.each((i, j) => {
      // Add a link to the mini profile
      const link = $(`<a class='miniprofile-${i}' style="float:right;"><img src="https://raw.githubusercontent.com/Goltred/tornscripts/master/images/miniprofile.png" style="width: 19px; height: 19px; vertical-align: middle;"></img></a>`);
      $(j).find(locationSelector).append(link);
    });

    $('a[class*="miniprofile-"]').on('click', TornMiniProfile.openProfile);
