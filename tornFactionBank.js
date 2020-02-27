// ==UserScript==
// @name         Torn City - Faction Bank
// @namespace    Goltred.Faction
// @version      0.4
// @description  Display money on faction bank and online bankers
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBank.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBank.js
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

class TornAPI {
  constructor(key) {
    this.baseUrl = 'https://api.torn.com'
    this.key = key;
    this.userData = {};
  }

  async setupUserData() {
    console.log('setting up');
    let data = await this.user();
    if (data) {
      this.userData.name = data.name;
      this.userData.player_id = data.player_id;
    }
  }

  async faction(selections = '') {
    const targetUrl = `${this.baseUrl}/faction/?selections=${selections}&key=${this.key}`;
    return new Promise((resolve) => {
      $.get(targetUrl, (data) => {
        resolve(data);
      });
    });
  }

  async user(selections = '') {
    const targetUrl = `${this.baseUrl}/user/?selections=${selections ? selections : ''}&key=${this.key}`;
    return new Promise((resolve) => {
      $.get(targetUrl, (data) => {
        resolve(data);
      });
    });
  }
}

function showAPIInput() {
  const body = $('body');

  const inputBox = $(`
<div class="info-msg" style="position: absolute;top: 0;right: 0;background-color: lightgray; border-style: solid; border-left: 5px solid red;">
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
}

function displayFactionMoney(data, userData) {
  if (data) {
    const { donations } = data;
    const { money_balance } = donations[userData.player_id];

    if (money_balance) {
      //const statusIcons = $('ul[class^="status-icons"]');
      const userMoney = $('#user-money');

      const factMoneyP = $('<p style="font-size:.8rem;"><strong>Faction:</strong></p>');
      const moneySpan = $('<span style="color: green;"></span>');
      factMoneyP.append(moneySpan);
      userMoney.after(factMoneyP);

      if (money_balance < 0) moneySpan.css('color', 'red');

      moneySpan.text(` $${money_balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`);

    }
  }
}

const apiKey = GM_getValue('apikey');

if (!apiKey) {
  showAPIInput();
} else {
  // Initialize torn api
  const api = new TornAPI(apiKey);
  api.user().then((userData) => {
    // Get the donations from the faction
    api.faction('donations').then((facData) => {
      displayFactionMoney(facData, userData);
    });
  });
}
