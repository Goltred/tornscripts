// ==UserScript==
// @name         Torn City - High Low Helper
// @namespace    Goltred.Casino
// @version      0.1.0
// @description  Calculate odds in casino high low game
// @author       Goltred
// @updateURL    https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCasinoHighLow.js
// @downloadURL  https://raw.githubusercontent.com/Goltred/tornscripts/master/tornCasinoHighLow.js
// @match        https://www.torn.com/loader.php?sid=highlow
// @grant        none
// @require      https://raw.githubusercontent.com/Goltred/tornscripts/master/classes/Logger.js
// ==/UserScript==

const logger = new Logger('tornCasinoHighLow');

// Setup listeners
$(document).ajaxComplete((evt, xhr, settings) => {
  if (settings.url.includes('loader.php?sid=hiloJson')) {
    const response = new AjaxResponse(xhr);
    const state = new GameState(response);
    GameController.act(state);
  }
});

class AjaxResponse {
  constructor(xhr) {
    const response = JSON.parse(xhr.responseText);
    Object.keys(response).forEach((k) => {
      this[k] = response[k];
    })
  }
}

class GameState {
  constructor(response) {
    this.state = response.status;
    this.DB = response.DB
    if (this.state && this.state !== 'startGame') // Only startGame doesn't have a currentGame key
      this.currentGame = response.currentGame[0];
  }
}

class Card {
  constructor(name, suite, value) {
      this.name = name;
      this.value = value
      this.suite = suite;
      this.classCode = `${suite}-${name}`;
  }

  toString() {
      return this.suite + "-" + this.name;
  }
}

//Define the Deck class
class Deck {
  constructor(cardValues, suites) {
    this.cards = [];
    this.discardPile = [];

    //Create the whole deck, 12 cards per suite
    for (var i = 0; i < suites.length; i++) {
      for (var key in cardValues) {
        var newCard = new Card(key, suites[i], cardValues[key]);
        this.cards.push(newCard);
      }
    }
  }

  reset() {
    this.cards = this.cards.concat(this.discardPile);
    this.discardPile = [];
  }

  discard(card) {
      this.discardPile.push(card);
  }

  getCard(classCode) {
    //Get a given card from the deck based on the given
    //torn classCode. Adding it to the discard pile.

    for (var i = 0; i < this.cards.length; i++) {
      var card = this.cards[i];
      if (card.classCode == classCode) {
        this.cards.splice(i, 1);
        this.discard(card);
        return card;
      }
    }

    logger.debug(`A card could not be found in the deck for classCode ${classCode}`);
  }

  filterCards(card, diff) {
      //Return an array with cards of higher, lower or same
      //value as the provided card.
      //Diff should be 0, positive or a negative number

      var result = []

      for (var i = 0; i < this.cards.length; i++) {
          var current_card = this.cards[i];
          if (diff > 0) {
              //Retrieve cards that have a higher value
              if (current_card.value >= card.value) {
                  //Card is lower
                  var current_card = undefined;
              }
          }
          else if (diff == 0) {
              //filter same value cards
              if (current_card.value != card.value) {
                  //Card is not the same
                  var current_card = undefined;
              }
          }
          else if (diff < 0) {
              //filter lower cards
              if (current_card.value <= card.value) {
                  //Card is higher
                  var current_card = undefined;
              }
          }

          if (current_card !== undefined) {
              result.push(current_card);
          }
      }

      return result;
  }

  calculateOdds(card) {
      //Calculate the probability of getting a higher or lower card
      //value 0 is higher than value 12

      //Get the number of cards above the current_card
      var higher = this.filterCards(card, 1);

      //Get the number of cards below the current_card
      var lower = this.filterCards(card, -1);

      //Same cards
      var same = this.filterCards(card, 0);

      var higher = ((higher.length / this.cards.length) * 100).toFixed(3);
      var lower = ((lower.length / this.cards.length) * 100).toFixed(3);
      var same = ((same.length / this.cards.length) * 100).toFixed(3);

      logger.debug("Chances are:");
      logger.debug(`  Higher: ${higher}%`);
      logger.debug(`  Lower: ${lower}%`);
      logger.debug(`  Same: ${same}%`);

      return {
        higher,
        lower,
        same
      }
  }
}

class GameController {
  static cardValues = {
    "A": 0,
    "K": 1,
    "Q": 2,
    "J": 3,
    "10": 4,
    "9": 5,
    "8": 6,
    "7": 7,
    "6": 8,
    "5": 9,
    "4": 10,
    "3": 11,
    "2": 12
  };

  static suites = [
    "diamonds",
    "clubs",
    "spades",
    "hearts"
  ];

  static deck = new Deck(GameController.cardValues, GameController.suites)

  static act(state) {
    if (state.currentGame) {
      // Check if we should calculate odds or not based on the status of the response
      if (state.state === 'gameStarted' || state.state === 'makeChoice') {
        const { dealerCardInfo, playerCardInfo } = state.currentGame;

        if (playerCardInfo) // Game was either lost or we just picked a card
          GameController.deck.getCard(playerCardInfo.classCode);
        else {
          const card = GameController.deck.getCard(dealerCardInfo.classCode);

          const chances = GameController.deck.calculateOdds(card);
          UIController.addChances(chances);
        }
      }
    }

    if (state.DB.deckShuffled)
      GameController.deck.reset();

    logger.debug('Current Deck', GameController.deck);
  }
}

class UIController {
  static addChances(chances) {
    $('#tchl-low').remove();
    $('#tchl-high').remove();
    $('div.action-btn-wrap.low').append($(`<span style="z-index: 10; color: red" id="tchl-low">${chances.lower}%</span>`));
    $('div.action-btn-wrap.high').append($(`<span style="z-index: 10; color: red" id="tchl-high">${chances.higher}%</span>`));

    // Hide the bottom item because it is bothering...
    $('div.item-8').css('display', 'none');
  }
}
