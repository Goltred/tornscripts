// ==UserScript==
// @name Torn Combat Helper
// @namespace https://github.com/Goltred/tornscripts
// @version 1.1.1
// @description Changes to the combat screen to help in different situations
// @author Goltred
// @updateURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCombat.user.js
// @downloadURL https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCombat.user.js
// @match https://www.torn.com/loader.php?sid=attack*
// @grant GM_setValue
// @grant GM_getValue
// @run-at document-end
// ==/UserScript==

const defaults = {
  hideLeave: false,
  hideMug: false,
  hideHosp: false,
  hideArrest: false
};

class Storage {
  static getSettings(defaultSettings) {
    const settings = GM_getValue('settings');

    if (!settings) {
      // We need to setup the defaults
      GM_setValue('settings', defaultSettings);
      return defaults;
    }

    return settings;
  }

  static saveSettings() {
    console.log("test");
    const options = Settings.fromUI();
    console.log(options);
    const modifiedOptions = Object.assign({}, defaults, options);
    GM_setValue('settings', modifiedOptions);
  }
}

class Settings {
  static fromUI() {
    const settings = {};
    settings.hideLeave = $("#tc-hideleave").is(':checked');
    settings.hideMug = $("#tc-hidemug").is(':checked');
    settings.hideHosp = $("#tc-hidehosp").is(':checked');
    settings.hideArrest = $("#tc-hidearrest").is(':checked');

    return settings;
  }
}

function combatUI(settings) {
  const boxTitle = $('<div class="title-black top-round m-top10">Torn Combat Settings</div>');
  $('div.content-wrapper').before(boxTitle);
  const boxBody = $('<div style="border-top: 1px solid #3e3e3e; background-color: #2e2e2e; color: #ccc; border-radius: 0 0 5px 5px;"></div>');
  let controls = $('<p style="padding: 10px;" id="tc-settings"></p>');
  controls.append($(`<span style="margin: 0 2px 0 2px;"><input type="checkbox" id="tc-hideleave" ${settings.hideLeave ? 'checked' : ''}><label for="tc-hideleave">Hide Leave</label></span>`));
  controls.append($(`<span style="margin: 0 2px 0 2px;"><input type="checkbox" id="tc-hidemug" ${settings.hideMug ? 'checked' : ''}><label for="tc-hidemug">Hide Mug</label></span>`));
  controls.append($(`<span style="margin: 0 2px 0 2px;"><input type="checkbox" id="tc-hidehosp" ${settings.hideHosp ? 'checked' : ''}><label for="tc-hidehosp">Hide Hospitalize</label></span>`));
  controls.append($(`<span style="margin: 0 2px 0 2px;"><input type="checkbox" id="tc-hidearrest" ${settings.hideArrest ? 'checked' : ''}><label for="tc-hidearrest">Hide Arrest</label></span>`));
  boxBody.append(controls);
  boxTitle.after(boxBody);

  console.log("ui");
  $("#tc-settings").on("click", () => {
    Storage.saveSettings();
    processButtons();
  });
}

function processButtons(targetElement) {
  console.log(targetElement);
  const settings = Settings.fromUI();

  let buttons = [];
  if (targetElement === undefined)
    buttons = $("div[class^='dialogButtons']").find("button");
  else {
    buttons = $(targetElement).find("button");
  }

  console.log(buttons);

  buttons.each((idx, el) => {
    const jqElement = $(el);
    console.log(jqElement);
    if (jqElement.text().toLowerCase() == 'leave') settings.hideLeave ? jqElement.hide() : jqElement.show();
    if (jqElement.text().toLowerCase() == 'mug') settings.hideMug ? jqElement.hide() : jqElement.show();
    if (jqElement.text().toLowerCase() == 'hospitalize') settings.hideHosp ? jqElement.hide() : jqElement.show();
    if (jqElement.text().toLowerCase() == 'arrest') settings.hideArrest ? jqElement.hide() : jqElement.show();
  });
}

// When combat finishes, a single node seems to be added with the buttons. What i've seen is that a record containing
// a single node addition is triggered, which is why i look only for this.
function watchCombat() {
  const target = $('body')[0];
  const observer = new MutationObserver((mutations, observer) => {
    mutations.forEach((record) => {
      // Quit if nothing is being added
      if (record.addedNodes.length == 0) return;

      console.log(record);

      const node = record.addedNodes[0];

      // svg nodes have an object as a classname
      if (typeof node.className != "string") return;

      // Quit if a defender modal is not being added
      if (!node.className.includes('modal') && !node.className.includes('defender')) return;

      processButtons(node);
    });
  });

  observer.observe(target, {
    subtree: true,
    childList: true,
  });
}

const settings = Storage.getSettings(defaults);

combatUI(settings);

watchCombat();
