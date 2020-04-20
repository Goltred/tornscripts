// ==UserScript==
// @name         Torn - Item Market Direct Link
// @namespace    https://github.com/Goltred/tornscripts
// @version      1.0
// @description  Change the name of items to be a direct link to the item market while looking at the Bazaar
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-market-direct-link.user.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/torn-market-direct-link.user.js
// @match        https://www.torn.com/bazaar.php
// @grant        none
// ==/UserScript==

$(document).ajaxComplete((evt, xhr, settings) => {
    if (settings.url.includes('inventory.php') && settings.data.includes('step=getList')) {
        console.log(xhr);
        console.log(settings);

        let spans = $(`span.t-overflow`);
        spans.each((i, e) => {
            const itemName = $(e).text();

            let marketLink = `https://www.torn.com/imarket.php#/p=shop&step=shop&type=&searchname=${itemName.replace(' ', '+')}`;

            // Replace the name by a link
            const a = $(`<a href='${marketLink}'></a>`);
            $(e).parent().append(a);
            a.append($(e));
        });
    }
});
