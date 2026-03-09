// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ZivyCoin.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ZivyCoinFactory
 * @notice Deploys one ZivyCoin contract per expert and handles
 *         USDT collection (purchase) and expert payouts (on burn).
 *
 *         Flow:
 *         1. Expert calls launchCoin() → deploys their personal ZivyCoin
 *         2. Seeker approves USDT, calls purchaseCoins() → USDT transferred to factory, coins minted
 *         3. Seeker interacts, platform calls spendCoins() → coins burned, USDT sent to expert (minus fee)
 */
contract ZivyCoinFactory {
    address public owner;
    address public immutable usdtToken;

    uint256 public platformFeeBps = 500; // 5% default (basis points, 10000 = 100%)
    uint256 public constant MAX_FEE_BPS = 1000; // max 10%

    // expert address => their coin contract
    mapping(address => address) public expertCoin;
    // coin contract => expert address (reverse lookup)
    mapping(address => address) public coinExpert;
    // all deployed coin addresses
    address[] public allCoins;

    event CoinLaunched(
        address indexed expert,
        address indexed coinAddress,
        string name,
        string symbol
    );
    event CoinsPurchased(
        address indexed buyer,
        address indexed coinAddress,
        uint256 coinAmount,
        uint256 usdtAmount
    );
    event CoinsSpent(
        address indexed spender,
        address indexed coinAddress,
        uint256 coinAmount,
        string interactionType,
        uint256 expertPayout,
        uint256 platformFee
    );
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event OwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "ZivyCoinFactory: caller is not the owner"
        );
        _;
    }

    constructor(address usdtToken_) {
        require(usdtToken_ != address(0), "ZivyCoinFactory: zero USDT address");
        owner = msg.sender;
        usdtToken = usdtToken_;
    }

    // ─── Expert launches their coin ───────────────────────────────────

    /**
     * @notice Deploy a personal coin for the calling expert.
     * @param name_ Token name (e.g., "Alex Coin")
     * @param symbol_ Token symbol (e.g., "ALEX")
     */
    function launchCoin(
        string calldata name_,
        string calldata symbol_
    ) external {
        require(
            expertCoin[msg.sender] == address(0),
            "ZivyCoinFactory: coin already launched"
        );

        ZivyCoin coin = new ZivyCoin(
            name_,
            symbol_,
            address(this), // factory is the platform
            msg.sender, // expert
            usdtToken
        );

        address coinAddr = address(coin);
        expertCoin[msg.sender] = coinAddr;
        coinExpert[coinAddr] = msg.sender;
        allCoins.push(coinAddr);

        emit CoinLaunched(msg.sender, coinAddr, name_, symbol_);
    }

    // ─── Seeker purchases coins ───────────────────────────────────────

    /**
     * @notice Buy an expert's coins with USDT. Caller must approve USDT first.
     * @param coinAddress The expert's ZivyCoin contract
     * @param coinAmount Number of coins to buy (in wei, 18 decimals)
     */
    function purchaseCoins(address coinAddress, uint256 coinAmount) external {
        require(
            coinExpert[coinAddress] != address(0),
            "ZivyCoinFactory: invalid coin"
        );
        require(coinAmount > 0, "ZivyCoinFactory: zero amount");

        ZivyCoin coin = ZivyCoin(coinAddress);
        uint256 usdtCost = (coinAmount * coin.COIN_PRICE()) / 1e18;
        require(usdtCost > 0, "ZivyCoinFactory: amount too small");

        // Transfer USDT from buyer to factory
        require(
            IERC20(usdtToken).transferFrom(msg.sender, address(this), usdtCost),
            "ZivyCoinFactory: USDT transfer failed"
        );

        // Mint coins to buyer
        coin.mint(msg.sender, coinAmount);

        emit CoinsPurchased(msg.sender, coinAddress, coinAmount, usdtCost);
    }

    // ─── Platform burns coins on interaction ──────────────────────────

    /**
     * @notice Burn a seeker's coins for an interaction and pay the expert.
     *         Only callable by the factory owner (Zivy backend).
     * @param coinAddress The expert's ZivyCoin contract
     * @param spender The seeker whose coins are burned
     * @param coinAmount Number of coins to burn
     * @param interactionType Type of interaction (e.g., "dm", "audio_call", "video_call")
     */
    function spendCoins(
        address coinAddress,
        address spender,
        uint256 coinAmount,
        string calldata interactionType
    ) external onlyOwner {
        require(
            coinExpert[coinAddress] != address(0),
            "ZivyCoinFactory: invalid coin"
        );
        require(coinAmount > 0, "ZivyCoinFactory: zero amount");

        ZivyCoin coin = ZivyCoin(coinAddress);
        address expert = coin.expert();

        // Burn the seeker's coins
        coin.burn(spender, coinAmount, interactionType);

        // Calculate USDT payout
        uint256 usdtValue = (coinAmount * coin.COIN_PRICE()) / 1e18;
        uint256 fee = (usdtValue * platformFeeBps) / 10000;
        uint256 expertPayout = usdtValue - fee;

        // Pay the expert
        if (expertPayout > 0) {
            require(
                IERC20(usdtToken).transfer(expert, expertPayout),
                "ZivyCoinFactory: expert payout failed"
            );
        }

        emit CoinsSpent(
            spender,
            coinAddress,
            coinAmount,
            interactionType,
            expertPayout,
            fee
        );
    }

    // ─── Admin ────────────────────────────────────────────────────────

    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "ZivyCoinFactory: fee too high");
        emit PlatformFeeUpdated(platformFeeBps, newFeeBps);
        platformFeeBps = newFeeBps;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZivyCoinFactory: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Withdraw accumulated platform fees in USDT.
     * @param to Address to receive the fees
     */
    function withdrawFees(address to) external onlyOwner {
        uint256 balance = IERC20(usdtToken).balanceOf(address(this));
        require(balance > 0, "ZivyCoinFactory: no fees to withdraw");
        require(
            IERC20(usdtToken).transfer(to, balance),
            "ZivyCoinFactory: withdrawal failed"
        );
    }

    // ─── View helpers ─────────────────────────────────────────────────

    function totalCoinsLaunched() external view returns (uint256) {
        return allCoins.length;
    }

    function getCoinByExpert(address expert) external view returns (address) {
        return expertCoin[expert];
    }

    /**
     * @notice Calculate USDT cost for a given coin amount.
     * @param coinAddress The expert's ZivyCoin contract
     * @param coinAmount Number of coins (18 decimals)
     */
    function getUsdtCost(
        address coinAddress,
        uint256 coinAmount
    ) external view returns (uint256) {
        require(
            coinExpert[coinAddress] != address(0),
            "ZivyCoinFactory: invalid coin"
        );
        ZivyCoin coin = ZivyCoin(coinAddress);
        return (coinAmount * coin.COIN_PRICE()) / 1e18;
    }
}
