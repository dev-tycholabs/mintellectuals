// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @notice Mock USDT for Sepolia testing. 6 decimals like real USDT.
 *         Anyone can mint — this is a testnet-only contract.
 */
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock Tether USD", "USDT") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint test USDT to any address. Testnet only.
     * @param to Recipient address
     * @param amount Amount in 6-decimal USDT units
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
