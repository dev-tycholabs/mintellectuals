// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ZivyCoin
 * @notice Per-expert utility token on Zivy. 1 coin = $0.01 USDT.
 *         - Minted when seekers purchase with USDT
 *         - Burned when seekers spend on interactions (DM, call, etc.)
 *         - Transferable between users (gifting)
 *         - Mint/burn restricted to the Zivy platform
 */
contract ZivyCoin is ERC20 {
    address public immutable platform;
    address public immutable expert;
    uint256 public constant COIN_PRICE = 10000; // 0.01 USDT (USDT has 6 decimals: 0.01 * 1e6 = 10000)

    address public immutable usdtToken;

    event CoinsPurchased(
        address indexed buyer,
        uint256 coinAmount,
        uint256 usdtAmount
    );
    event CoinsBurned(
        address indexed user,
        uint256 coinAmount,
        string interactionType
    );

    modifier onlyPlatform() {
        require(msg.sender == platform, "ZivyCoin: caller is not the platform");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address platform_,
        address expert_,
        address usdtToken_
    ) ERC20(name_, symbol_) {
        require(platform_ != address(0), "ZivyCoin: zero platform address");
        require(expert_ != address(0), "ZivyCoin: zero expert address");
        require(usdtToken_ != address(0), "ZivyCoin: zero USDT address");
        platform = platform_;
        expert = expert_;
        usdtToken = usdtToken_;
    }

    /**
     * @notice Mint coins for a buyer. Platform collects USDT first, then calls this.
     * @param to The seeker receiving coins
     * @param amount Number of coins to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyPlatform {
        _mint(to, amount);
        uint256 usdtCost = (amount * COIN_PRICE) / 1e18;
        emit CoinsPurchased(to, amount, usdtCost);
    }

    /**
     * @notice Burn coins when a seeker spends them on an interaction.
     * @param from The seeker spending coins
     * @param amount Number of coins to burn
     * @param interactionType Description of the interaction (e.g., "dm", "video_call")
     */
    function burn(
        address from,
        uint256 amount,
        string calldata interactionType
    ) external onlyPlatform {
        _burn(from, amount);
        emit CoinsBurned(from, amount, interactionType);
    }

    /**
     * @notice Returns the number of decimals (standard 18 for ERC-20).
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
