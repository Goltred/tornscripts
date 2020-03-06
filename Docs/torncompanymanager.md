# torncompanymanager.js

## Description

This script provides easy prefilling of company restocking values so that acquiring stocks for your
company is fast and easy.

For its calculations:
* It takes the total amount sold
* For each stock, it calculates the ratio of inventory sold and proposes a new amount using the calculated ratio against the maximum storage capacity

## [Required] Manual Setup

This script requires that a variable is updated in order to use the right value for its calculations.

Please, change line 25 to reflect the maximum amount of storage available for your company:
```
const maxStorage = 100000;
```