// ==UserScript==
// @name         Detailed Faction Balances
// @namespace    Goltred.Faction
// @version      1.0.1
// @description  Add extra detail to faction money to know true faction balances and owed money
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBalances.user.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornFactionBalances.user.js
// @match        https://www.torn.com/factions.php?step=your*
// ==/UserScript==

$(document).ajaxComplete((evt, xhr, settings) => {
  if (settings.type === 'POST' && settings.data === 'step=getMoneyDepositors') {
    // Get depositors
    const { list } = JSON.parse(xhr.responseText);

    let userMoney = 0;
    let owedMoney = 0;
    list.forEach((user) => {
      const { balance } = user;
      if (balance >= 0) {
        userMoney += balance;
      } else {
        owedMoney += balance;
      }
    });

    addFactionMoney(userMoney, owedMoney);
  }
});

function addFactionMoney(userMoney, owed) {
  // Get total faction money
  const moneySpan = $('#money > div.give-block > div.info.no-divider > span > span');
  const total = moneySpan.attr('data-faction-money');
  const factionMoney = total - userMoney;

  // Check if elements are already there:
  let factMoneySpan = $('#tcfb-faction');
  let owedMoneySpan = $('#tcfb-owed');

  if (factMoneySpan.length === 0 || owedMoneySpan.length === 0) {
    // Get the parent div
    const div = moneySpan.closest('div.info.no-divider');

      // Create the new element
    const fMoneyDiv = $(`
    <div class="info no-divider" style="padding-left: 3em;">
      <p><strong>Faction Money:</strong> <span id="tcfb-faction"></span></p>
    </div>`);

    const owedMoneyDiv = $(`
    <div class="info no-divider" style="padding-left: 3em;">
      <p><strong>Owed Money:</strong> <span id="tcfb-owed"></span></p>
    </div>`);

    div.after(fMoneyDiv);
    fMoneyDiv.after(owedMoneyDiv);

    factMoneySpan = $('#tcfb-faction');
    owedMoneySpan = $('#tcfb-owed');
  }

  factMoneySpan.text(`$${factionMoney.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`);
  owedMoneySpan.text(`$${owed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`);
}
