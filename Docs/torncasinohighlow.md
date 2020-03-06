# torncasinohighlow.js

## Description

This script displays the probabilities of a given choice in the High-Low game to be higher than the other.

I tried to assume a couple of things about the game to try to make it a little bit more accurate:
1. The game has a 52 card deck
1. When the `Deck shuffled` notification appears, all cards go back into the deck

Taking this in play, the script is able to factor in cards that have been previously discarded while playing, causing probabilities to reflect to the current state of the deck
