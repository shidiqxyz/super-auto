// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Opsional, jika ingin fitur owner

contract MyToken is ERC20, Ownable {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) Ownable(msg.sender) {
        // initialSupply sudah termasuk desimal. Misal: 1B token dengan 18 desimal
        // adalah 1_000_000_000 * (10**18)
        _mint(msg.sender, initialSupply * (10**uint256(decimals())));
    }
}