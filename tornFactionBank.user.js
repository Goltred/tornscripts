// ==UserScript==
// @name         Torn City - Faction Bank
// @namespace    Goltred.Faction
// @version      0.14.4
// @description  Display money on faction bank and online bankers
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBank.user.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBank.user.js
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @require      https://raw.githubusercontent.com/Goltred/tornscripts/dev/classes/TornAPI.js
// ==/UserScript==

class Faction {
  static parseAnnouncement() {
    if (document.URL.includes('factions.php?step=your')) {
      const div = $(".cont-gray10");
      const imgs = div.find("a[href*='profiles.php'] > img");
      const ids = []
      imgs.each((idx, img) => {
        // get alt attribute
        const role = img.alt;

        // Check if the span text is role-banker
        if (role.trim().toLowerCase() == 'banker') {
          // get the profile id from the parent a tag of the span
          const re = new RegExp('XID=(?<id>\\d+)');
          const match = re.exec($(img).parent().attr('href'));
          if (match.length > 0) ids.push(match.groups.id);
        }
      });
      GM_setValue('bankers', ids);
    }
  }

  static getBankersHTML(facBasicData) {
    const bankers = GM_getValue('bankers');
    const html = ['<p><strong>Online Bankers:</strong></p>'];
    if (bankers) {
      const { members } = facBasicData;

      // Filter based on status
      const onlineBankers = bankers.filter((id) => members[id].last_action.status !== 'Offline');

      if (onlineBankers.length === 0) {
        html.push('None :\'(');
      } else {
        onlineBankers.forEach((banker) => {
          const { name, last_action } = members[banker];
          html.push(`<a href="https://www.torn.com/profiles.php?XID=${banker}">${name} (${last_action.status})</a>`);
        });
      }
    } else {
      html.push('No bankers have been detected. Visit your faction page to fetch them from the announcements');
    }

    return html.join('<br />');
  }
}

function showAPIInput() {
  const body = $('body');

  const inputBox = $(`
<div class="info-msg" id="tcfb-apibox" style="position: absolute;top: 0;right: 0;background-color: lightgray; border-style: solid; border-left: 5px solid red; z-index: 100000">
  <p>Enter your API Key</p>
  <input type="text" id="tcfb-input-api" />
  <button id="tcfb-save-api">Save</button>
</div>`);
  body.append(inputBox);
  $('#tcfb-save-api').on('click', () => tcfb_saveAPI());
}

function tcfb_saveAPI() {
  const val = $('#tcfb-input-api').val();
  GM_setValue('apikey', val);
  $("#tcfb-apibox").css('display', 'none');
  main(val);
}

function displayFactionMoney(data, userData, bankers) {
  // Add the styling required for tooltip
  GM_addStyle(".tcbf-tooltipbox { position: relative; display: contents; width: 100%; z-index: ; }");
  GM_addStyle(".tcbf-tooltiptext { visibility: hidden; width: 100%; background-color: white; text-align: center; padding: 5px 0; border-radius: 6px; border: 1px solid black; position: absolute; z-index: 20;");
  GM_addStyle(".tcbf-tooltipbox:hover .tcbf-tooltiptext { visibility: visible; }");

  // Move things inside an a element for tooltipping
  const factionDiv = $('<div id="tcbf-block" class="tcbf-tooltipbox"></div>');
  factionDiv.append($(`<span class="tcbf-tooltiptext">${bankers}</span>`));

  let moneyPointBlock;
  let newPointBlock;
  let moneySpan;
  if (getUserDevice() == 'desktop') {
    moneyPointBlock = $('#user-money').closest('p[class^="point-block"]');
    newPointBlock = moneyPointBlock.clone();

    // Get the label and value fields
    const label = newPointBlock.children("span").first();

    // Update the label and set the default value money
    label.text('Faction:');
  } else {
    // we are in mobile
    moneyPointBlock = $('#pointsMoney');
    newPointBlock = moneyPointBlock.clone();
    newPointBlock.id = 'factionMoney';
  }

  // Get the value field which is in a span
  const spans = newPointBlock.children("span");
  moneySpan = spans.last();

  newPointBlock.append(factionDiv);
  factionDiv.append(spans);

  moneySpan.css('color', '');
  moneySpan.text('$0');

  if (data) {
    const { donations } = data;
    if (donations) {
      // I should have some balance
      const { money_balance } = donations[userData.player_id];

      if (money_balance) {
        // Set colors
        if (money_balance < 0) moneySpan.css('color', 'red');
        else if (money_balance > 0) moneySpan.css('color', '#678c00');

        // Set text, formatting string as money
        moneySpan.text(` $${money_balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`);
      }
    }
  }

  // Add the element to the DOM
  moneyPointBlock.after(newPointBlock);
}

function cacheFactionData(factionData) {
  GM_setValue('factionData', {
    timestamp: new Date.now().getTime(),
    factionData
  });
}

function getCachedFactionData() {
  return { factionData } = GM_getValue('factionData');
}

function purgeFactionData(threshold = 600) {
  const { timestamp } = GM_getValue('factionData');

  if (timestamp && timestamp >= new Date().now().getTime() + threshold) {
    GM_setValue('factionData', '');
  }
}

async function main(apiKey) {
  const storage = {
    set: GM_setValue,
    get: GM_getValue
  };

  // Initialize torn api
  const api = new TornAPI(apiKey, storage);

  await api.setupUserData();

  const facData = getCachedFactionData() || await api.faction('basic,donations');

  // Try to parse a faction announcement if there is one
  Faction.parseAnnouncement();

  const bankers = Faction.getBankersHTML(facData);

  // Get the donations from the faction
  displayFactionMoney(facData, api.userData, bankers);
}

const apiKey = GM_getValue('apikey');

if (!apiKey) {
  showAPIInput();
} else {
  main(apiKey);
}
