// ==UserScript==
// @name         Torn City - Item Finder
// @namespace    Goltred.City.Finder
// @version      0.1
// @description  Looks for items in the city map and make them visible for easier collection
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCityFinder.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCityFinder.js
// @match        https://www.torn.com/city.php
// @grant        none
// ==/UserScript==

// For now, this works the best when fully zoomed out. Also, if the map is already zoomed in, then
// a refresh will be needed after zooming out since there are no listeners setup on map change
let wait = setInterval(() => {
  // Wait for map to load
  let loader = $('.map-loader-wp');
  if (loader && loader.css('display') === 'none') {
    clearInterval(wait);

    // Clear all markers
    let markers = $('.leaflet-marker-icon');
    $.each(markers, (idx, element) => {
      $(element).css('display', 'none');
    });

    // Also hide the faction marker shadow
    $('.leaflet-marker-shadow').css('display', 'none');

    // Get all item pinpoints
    let pinpoints = $('.user-item-pinpoint');

    $.each(pinpoints, (idx, element) => {
      // Get the previous element, which usually is the image of the item
      let jEl = $(element);
      let item = jEl.prev();

      // Modify the pinpoint. This will make things visible, but exact location when zoomed in
      // might be different
      jEl.switchClass('leaflet-zoom-hide', 'leaflet-zoom-show');
      jEl.css({
          display: 'block',
          clip: 'rect(0px, 42px, 56px, 0px)',
          top: -10,
          left: -2
      }); // Display only one of the circles of the image. These values only work when map is fully zoomed out

      // Modify the item image
      item.css({
          display: 'block',
          width: '38px',
      });
    });
  }
}, 100);