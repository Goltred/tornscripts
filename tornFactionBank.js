// ==UserScript==
// @name         Torn City - Faction Bank
// @namespace    Goltred.Faction
// @version      0.12
// @description  Display money on faction bank and online bankers
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBank.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBank.js
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

class TornAPI {
  constructor(key) {
    this.baseUrl = 'https://api.torn.com'
    this.key = key;
    this.userData = {};
  }

  async setupUserData() {
    let data = await this.user();
    if (data) {
      this.userData.name = data.name;
      this.userData.player_id = data.player_id;
    }
  }

  async faction(selections = '') {
    const targetUrl = `${this.baseUrl}/faction/?selections=${selections}&key=${this.key}`;
    return new Promise((resolve, reject) => {
      $.get(targetUrl, (data) => {
        if (data.error) reject(`Torn Faction Bank Script: Error Code: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }

  async user(selections = '') {
    const targetUrl = `${this.baseUrl}/user/?selections=${selections ? selections : ''}&key=${this.key}`;
    return new Promise((resolve) => {
      $.get(targetUrl, (data) => {
        if (data.error) reject(`Torn Faction Bank Script: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }
}

class Faction {
  static parseAnnouncement() {
    const div = $(".cont-gray10");
    if (div.length > 0) {
      const imgs = div.find("a[href*='profiles.php'] > img");
      const ids = []
      imgs.each((idx, img) => {
        // Get the closest row
        const row = $(img).closest('tr');
        const roleTd = $(row).children('td:first');
        const roleText = $(roleTd).text();

        // Check if the span text is role-banker
        if (roleText.trim().toLowerCase() !== 'sergeant') {
          // get the profile id from the parent a tag of the span
          const match = /XID=(?<id>\d+)/g.exec($(img).parent().attr('href'));
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
    }

    return html.join('<br />');
  }
}

function showAPIInput() {
  const body = $('body');

  const inputBox = $(`
<div class="info-msg" id="tcfb-apibox" style="position: absolute;top: 0;right: 0;background-color: lightgray; border-style: solid; border-left: 5px solid red;">
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
  // Copy the money point block
  const moneyPointBlock = $('#user-money').closest('p[class^="point-block"]');
  const newPointBlock = moneyPointBlock.clone();

  // Get the label and value fields
  const spans = newPointBlock.children("span");
  const label = spans.first();
  const moneySpan = spans.last();

  // Add the styling required for tooltip
  GM_addStyle(".tcbf-tooltipbox { position: relative; display: inline-block; width: 100% }");
  GM_addStyle(".tcbf-tooltiptext { visibility: hidden; width: 100%; background-color: white; text-align: center; padding: 5px 0; border-radius: 6px; border: 1px solid black; position: absolute; z-index: 1;");
  GM_addStyle(".tcbf-tooltipbox:hover .tcbf-tooltiptext { visibility: visible; }");

  // Move things inside an a element for tooltipping
  const factionDiv = $('<div id="tcbf-block" class="tcbf-tooltipbox"></div>');
  factionDiv.append($(`<span class="tcbf-tooltiptext">${bankers}</span>`));
  newPointBlock.append(factionDiv);
  factionDiv.append(spans);

  // Update the label and set the default value money
  label.text('Faction:');
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

async function main(apiKey) {
  // Initialize torn api
  const api = new TornAPI(apiKey);

  const [ userData, facData ] = await Promise.all([api.user(), api.faction('basic,donations')]);

  const bankers = Faction.getBankersHTML(facData);

  // Get the donations from the faction
  displayFactionMoney(facData, userData, bankers);

  // Try to parse a faction announcement if there is one
  Faction.parseAnnouncement();
}

const apiKey = GM_getValue('apikey');

if (!apiKey) {
  showAPIInput();
} else {
  main(apiKey);
}
