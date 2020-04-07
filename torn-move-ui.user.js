// ==UserScript==
// @name         Move Torn UI
// @namespace    https://github.com/Goltred/tornscripts
// @version      0.2
// @description  Move the lists after the main content
// @author       Goltred
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Modify the main container width
    let mc = $('#mainContainer');
    let currWidth = parseInt(mc.css('width'));
    mc.css('width', currWidth + 250);

    // Get the lists block
    let lists = $('h2:contains("Lists")').closest('div[class^="sidebar-block"]');

    // append a new div after the content wrapper
    let right = $('<div></div>');
    $('.content-wrapper').after(right);
    right.append(lists);
    right.css({
        'float': 'left',
        'margin-left': '20px'
    });
})();
