// ==UserScript==
// @name         Torn City - Item Finder
// @namespace    Goltred.City.Finder
// @version      0.4.0
// @description  Looks for items in the city map and make them visible for easier collection
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCityFinder.user.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCityFinder.user.js
// @match        https://www.torn.com/city.php
// @grant        none
// ==/UserScript==

// For now, this works the best when fully zoomed out. Also, if the map is already zoomed in, then
// a refresh will be needed after zooming out since there are no listeners setup on map change
$(document).ajaxComplete((evt, xhr, settings) => {
  const re = new RegExp('city\\.php.*step=mapData');
  if (re.exec(settings.url)) {
    const { territoryUserItems } = JSON.parse(xhr.responseText);
    CityMap.parse(territoryUserItems);
  }
});


class CityMap {
  static parse(userItems) {
    // Clear all markers
    let markers = $('.leaflet-marker-icon');
    $.each(markers, (idx, element) => {
      $(element).css('display', 'none');
    });

    // Also hide the faction marker shadow
    $('.leaflet-marker-shadow').css('display', 'none');

    // Get all item pinpoints
    let pinpoints = $('.user-item-pinpoint');

    // Create a new div to contain the list of things found
    //decode the userItems
    const items = JSON.parse(atob(userItems));
    let itemsDiv = $('<div class="cont-gray10"></div>');
    itemsDiv.append('<div class="m-bottom10"><strong><p>Torn City - Item Finder</p></strong></div>');
    itemsDiv.append(`<p>There are <strong>${pinpoints.length}</strong> items to pickup:</p>`);
    if (pinpoints.length > 0) {
      const itemsList = $('<p style="padding-left: 10px;"></p>');
      const itemsString = [];
      items.forEach((item) => {
        itemsString.push(item.title);
      });
      itemsList.text(itemsString.join(', '));
      itemsDiv.append(itemsList);
    }
    $('#map').after(itemsDiv);

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
}
