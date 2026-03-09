const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZivyCoinFactory", function () {
  let factory, mockUsdt, owner, expert1, expert2, seeker1, seeker2;
  const COIN_PRICE = 10000n; // 0.01 USDT in 6 decimals

  beforeEach(async function () {
    [owner, expert1, expert2, seeker1, seeker2] = await ethers.getSigners();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUsdt = await MockUSDT.deploy();

    const Factory = await ethers.getContractFactory("ZivyCoinFactory");
    factory = await Factory.deploy(await mockUsdt.getAddress());

    // Mint test USDT to seekers
    await mockUsdt.mint(seeker1.address, 1000000n * 10n ** 6n); // 1M USDT
    await mockUsdt.mint(seeker2.address, 1000000n * 10n ** 6n);
  });

  describe("Deployment", function () {
    it("should set deployer as owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("should set correct USDT address", async function () {
      expect(await factory.usdtToken()).to.equal(await mockUsdt.getAddress());
    });

    it("should have default 5% platform fee", async function () {
      expect(await factory.platformFeeBps()).to.equal(500);
    });

    it("should start with zero coins launched", async function () {
      expect(await factory.totalCoinsLaunched()).to.equal(0);
    });

    it("should revert if USDT address is zero", async function () {
      const Factory = await ethers.getContractFactory("ZivyCoinFactory");
      await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "ZivyCoinFactory: zero USDT address"
      );
    });
  });

  describe("Coin Launch", function () {
    it("should allow an expert to launch their coin", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      const coinAddr = await factory.getCoinByExpert(expert1.address);
      expect(coinAddr).to.not.equal(ethers.ZeroAddress);
      expect(await factory.totalCoinsLaunched()).to.equal(1);
    });

    it("should emit CoinLaunched event", async function () {
      await expect(factory.connect(expert1).launchCoin("Alex Coin", "ALEX"))
        .to.emit(factory, "CoinLaunched");
    });

    it("should set correct expert and platform on the coin", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      const coinAddr = await factory.getCoinByExpert(expert1.address);
      const coin = await ethers.getContractAt("ZivyCoin", coinAddr);
      expect(await coin.expert()).to.equal(expert1.address);
      expect(await coin.platform()).to.equal(await factory.getAddress());
    });

    it("should set correct name and symbol on the coin", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      const coinAddr = await factory.getCoinByExpert(expert1.address);
      const coin = await ethers.getContractAt("ZivyCoin", coinAddr);
      expect(await coin.name()).to.equal("Alex Coin");
      expect(await coin.symbol()).to.equal("ALEX");
    });

    it("should revert if expert tries to launch a second coin", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      await expect(
        factory.connect(expert1).launchCoin("Alex Coin 2", "ALEX2")
      ).to.be.revertedWith("ZivyCoinFactory: coin already launched");
    });

    it("should allow multiple experts to launch coins", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      await factory.connect(expert2).launchCoin("Sarah Coin", "SARAH");
      expect(await factory.totalCoinsLaunched()).to.equal(2);

      const coin1 = await factory.getCoinByExpert(expert1.address);
      const coin2 = await factory.getCoinByExpert(expert2.address);
      expect(coin1).to.not.equal(coin2);
    });

    it("should store reverse lookup (coin → expert)", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      const coinAddr = await factory.getCoinByExpert(expert1.address);
      expect(await factory.coinExpert(coinAddr)).to.equal(expert1.address);
    });
  });

  describe("Purchasing Coins", function () {
    let coinAddr;

    beforeEach(async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      coinAddr = await factory.getCoinByExpert(expert1.address);
    });

    it("should allow seeker to purchase coins with USDT", async function () {
      const coinAmount = ethers.parseEther("100"); // 100 coins
      const usdtCost = (coinAmount * COIN_PRICE) / ethers.parseEther("1"); // 1,000,000 (1 USDT)

      await mockUsdt.connect(seeker1).approve(await factory.getAddress(), usdtCost);
      await factory.connect(seeker1).purchaseCoins(coinAddr, coinAmount);

      const coin = await ethers.getContractAt("ZivyCoin", coinAddr);
      expect(await coin.balanceOf(seeker1.address)).to.equal(coinAmount);
    });

    it("should transfer correct USDT amount to factory", async function () {
      const coinAmount = ethers.parseEther("500"); // 500 coins = 5 USDT
      const usdtCost = (coinAmount * COIN_PRICE) / ethers.parseEther("1");

      const factoryAddr = await factory.getAddress();
      const balanceBefore = await mockUsdt.balanceOf(factoryAddr);

      await mockUsdt.connect(seeker1).approve(factoryAddr, usdtCost);
      await factory.connect(seeker1).purchaseCoins(coinAddr, coinAmount);

      const balanceAfter = await mockUsdt.balanceOf(factoryAddr);
      expect(balanceAfter - balanceBefore).to.equal(usdtCost);
    });

    it("should emit CoinsPurchased event", async function () {
      const coinAmount = ethers.parseEther("100");
      const usdtCost = (coinAmount * COIN_PRICE) / ethers.parseEther("1");

      await mockUsdt.connect(seeker1).approve(await factory.getAddress(), usdtCost);
      await expect(factory.connect(seeker1).purchaseCoins(coinAddr, coinAmount))
        .to.emit(factory, "CoinsPurchased")
        .withArgs(seeker1.address, coinAddr, coinAmount, usdtCost);
    });

    it("should revert if USDT not approved", async function () {
      const coinAmount = ethers.parseEther("100");
      await expect(
        factory.connect(seeker1).purchaseCoins(coinAddr, coinAmount)
      ).to.be.reverted;
    });

    it("should revert if insufficient USDT balance", async function () {
      const [, , , , , poorUser] = await ethers.getSigners();
      const coinAmount = ethers.parseEther("100");
      const usdtCost = (coinAmount * COIN_PRICE) / ethers.parseEther("1");

      await mockUsdt.connect(poorUser).approve(await factory.getAddress(), usdtCost);
      await expect(
        factory.connect(poorUser).purchaseCoins(coinAddr, coinAmount)
      ).to.be.reverted;
    });

    it("should revert for invalid coin address", async function () {
      await expect(
        factory.connect(seeker1).purchaseCoins(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("ZivyCoinFactory: invalid coin");
    });

    it("should revert for zero coin amount", async function () {
      await expect(
        factory.connect(seeker1).purchaseCoins(coinAddr, 0)
      ).to.be.revertedWith("ZivyCoinFactory: zero amount");
    });

    it("should allow multiple seekers to purchase the same expert's coins", async function () {
      const amount = ethers.parseEther("100");
      const usdtCost = (amount * COIN_PRICE) / ethers.parseEther("1");

      await mockUsdt.connect(seeker1).approve(await factory.getAddress(), usdtCost);
      await factory.connect(seeker1).purchaseCoins(coinAddr, amount);

      await mockUsdt.connect(seeker2).approve(await factory.getAddress(), usdtCost);
      await factory.connect(seeker2).purchaseCoins(coinAddr, amount);

      const coin = await ethers.getContractAt("ZivyCoin", coinAddr);
      expect(await coin.balanceOf(seeker1.address)).to.equal(amount);
      expect(await coin.balanceOf(seeker2.address)).to.equal(amount);
      expect(await coin.totalSupply()).to.equal(amount * 2n);
    });
  });

  describe("Spending Coins (Burn + Payout)", function () {
    let coinAddr;
    const purchaseAmount = ethers.parseEther("1000"); // 1000 coins = 10 USDT

    beforeEach(async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      coinAddr = await factory.getCoinByExpert(expert1.address);

      const usdtCost = (purchaseAmount * COIN_PRICE) / ethers.parseEther("1");
      await mockUsdt.connect(seeker1).approve(await factory.getAddress(), usdtCost);
      await factory.connect(seeker1).purchaseCoins(coinAddr, purchaseAmount);
    });

    it("should burn coins and pay expert (minus platform fee)", async function () {
      const spendAmount = ethers.parseEther("500"); // 500 coins = 5 USDT
      const usdtValue = (spendAmount * COIN_PRICE) / ethers.parseEther("1"); // 5,000,000
      const fee = (usdtValue * 500n) / 10000n; // 5% = 250,000
      const expertPayout = usdtValue - fee; // 4,750,000

      const expertBalanceBefore = await mockUsdt.balanceOf(expert1.address);
      await factory.connect(owner).spendCoins(coinAddr, seeker1.address, spendAmount, "video_call");
      const expertBalanceAfter = await mockUsdt.balanceOf(expert1.address);

      expect(expertBalanceAfter - expertBalanceBefore).to.equal(expertPayout);

      const coin = await ethers.getContractAt("ZivyCoin", coinAddr);
      expect(await coin.balanceOf(seeker1.address)).to.equal(purchaseAmount - spendAmount);
    });

    it("should emit CoinsSpent event with correct values", async function () {
      const spendAmount = ethers.parseEther("200");
      const usdtValue = (spendAmount * COIN_PRICE) / ethers.parseEther("1");
      const fee = (usdtValue * 500n) / 10000n;
      const expertPayout = usdtValue - fee;

      await expect(
        factory.connect(owner).spendCoins(coinAddr, seeker1.address, spendAmount, "dm")
      )
        .to.emit(factory, "CoinsSpent")
        .withArgs(seeker1.address, coinAddr, spendAmount, "dm", expertPayout, fee);
    });

    it("should reduce total supply after burn", async function () {
      const spendAmount = ethers.parseEther("300");
      const coin = await ethers.getContractAt("ZivyCoin", coinAddr);
      const supplyBefore = await coin.totalSupply();

      await factory.connect(owner).spendCoins(coinAddr, seeker1.address, spendAmount, "audio_call");

      expect(await coin.totalSupply()).to.equal(supplyBefore - spendAmount);
    });

    it("should revert if non-owner tries to spend coins", async function () {
      await expect(
        factory.connect(seeker1).spendCoins(coinAddr, seeker1.address, ethers.parseEther("10"), "dm")
      ).to.be.revertedWith("ZivyCoinFactory: caller is not the owner");
    });

    it("should revert if spending more than seeker's balance", async function () {
      await expect(
        factory.connect(owner).spendCoins(coinAddr, seeker1.address, ethers.parseEther("2000"), "dm")
      ).to.be.reverted;
    });

    it("should revert for invalid coin address", async function () {
      await expect(
        factory.connect(owner).spendCoins(ethers.ZeroAddress, seeker1.address, ethers.parseEther("10"), "dm")
      ).to.be.revertedWith("ZivyCoinFactory: invalid coin");
    });

    it("should revert for zero amount", async function () {
      await expect(
        factory.connect(owner).spendCoins(coinAddr, seeker1.address, 0, "dm")
      ).to.be.revertedWith("ZivyCoinFactory: zero amount");
    });

    it("should keep platform fee in factory contract", async function () {
      const spendAmount = ethers.parseEther("1000"); // all coins = 10 USDT
      const usdtValue = (spendAmount * COIN_PRICE) / ethers.parseEther("1");
      const fee = (usdtValue * 500n) / 10000n;

      await factory.connect(owner).spendCoins(coinAddr, seeker1.address, spendAmount, "video_call");

      const factoryBalance = await mockUsdt.balanceOf(await factory.getAddress());
      expect(factoryBalance).to.equal(fee);
    });
  });

  describe("Full Flow: Purchase → Transfer → Spend", function () {
    it("should handle gifted coins being spent", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      const coinAddr = await factory.getCoinByExpert(expert1.address);

      // Seeker1 buys 200 coins
      const buyAmount = ethers.parseEther("200");
      const usdtCost = (buyAmount * COIN_PRICE) / ethers.parseEther("1");
      await mockUsdt.connect(seeker1).approve(await factory.getAddress(), usdtCost);
      await factory.connect(seeker1).purchaseCoins(coinAddr, buyAmount);

      // Seeker1 gifts 50 coins to seeker2
      const coin = await ethers.getContractAt("ZivyCoin", coinAddr);
      await coin.connect(seeker1).transfer(seeker2.address, ethers.parseEther("50"));

      expect(await coin.balanceOf(seeker1.address)).to.equal(ethers.parseEther("150"));
      expect(await coin.balanceOf(seeker2.address)).to.equal(ethers.parseEther("50"));

      // Seeker2 spends gifted coins on a DM
      const spendAmount = ethers.parseEther("50");
      const expertBalanceBefore = await mockUsdt.balanceOf(expert1.address);
      await factory.connect(owner).spendCoins(coinAddr, seeker2.address, spendAmount, "dm");

      expect(await coin.balanceOf(seeker2.address)).to.equal(0);
      const expertBalanceAfter = await mockUsdt.balanceOf(expert1.address);
      expect(expertBalanceAfter).to.be.gt(expertBalanceBefore);
    });
  });

  describe("Admin Functions", function () {
    describe("Platform Fee", function () {
      it("should allow owner to update fee", async function () {
        await factory.connect(owner).setPlatformFee(800); // 8%
        expect(await factory.platformFeeBps()).to.equal(800);
      });

      it("should emit PlatformFeeUpdated event", async function () {
        await expect(factory.connect(owner).setPlatformFee(300))
          .to.emit(factory, "PlatformFeeUpdated")
          .withArgs(500, 300);
      });

      it("should revert if fee exceeds max (10%)", async function () {
        await expect(
          factory.connect(owner).setPlatformFee(1500)
        ).to.be.revertedWith("ZivyCoinFactory: fee too high");
      });

      it("should allow setting fee to zero", async function () {
        await factory.connect(owner).setPlatformFee(0);
        expect(await factory.platformFeeBps()).to.equal(0);
      });

      it("should revert if non-owner tries to update fee", async function () {
        await expect(
          factory.connect(expert1).setPlatformFee(300)
        ).to.be.revertedWith("ZivyCoinFactory: caller is not the owner");
      });

      it("should apply updated fee to subsequent spends", async function () {
        await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
        const coinAddr = await factory.getCoinByExpert(expert1.address);

        const buyAmount = ethers.parseEther("1000");
        const usdtCost = (buyAmount * COIN_PRICE) / ethers.parseEther("1");
        await mockUsdt.connect(seeker1).approve(await factory.getAddress(), usdtCost);
        await factory.connect(seeker1).purchaseCoins(coinAddr, buyAmount);

        // Change fee to 0%
        await factory.connect(owner).setPlatformFee(0);

        const spendAmount = ethers.parseEther("1000");
        const usdtValue = (spendAmount * COIN_PRICE) / ethers.parseEther("1");

        const expertBefore = await mockUsdt.balanceOf(expert1.address);
        await factory.connect(owner).spendCoins(coinAddr, seeker1.address, spendAmount, "dm");
        const expertAfter = await mockUsdt.balanceOf(expert1.address);

        // Expert gets 100% with 0% fee
        expect(expertAfter - expertBefore).to.equal(usdtValue);
      });
    });

    describe("Ownership Transfer", function () {
      it("should allow owner to transfer ownership", async function () {
        await factory.connect(owner).transferOwnership(expert1.address);
        expect(await factory.owner()).to.equal(expert1.address);
      });

      it("should emit OwnershipTransferred event", async function () {
        await expect(factory.connect(owner).transferOwnership(expert1.address))
          .to.emit(factory, "OwnershipTransferred")
          .withArgs(owner.address, expert1.address);
      });

      it("should revert if transferring to zero address", async function () {
        await expect(
          factory.connect(owner).transferOwnership(ethers.ZeroAddress)
        ).to.be.revertedWith("ZivyCoinFactory: zero address");
      });

      it("should revert if non-owner tries to transfer", async function () {
        await expect(
          factory.connect(expert1).transferOwnership(expert1.address)
        ).to.be.revertedWith("ZivyCoinFactory: caller is not the owner");
      });

      it("should allow new owner to perform owner actions", async function () {
        await factory.connect(owner).transferOwnership(expert1.address);
        await factory.connect(expert1).setPlatformFee(200);
        expect(await factory.platformFeeBps()).to.equal(200);
      });

      it("should prevent old owner from performing owner actions", async function () {
        await factory.connect(owner).transferOwnership(expert1.address);
        await expect(
          factory.connect(owner).setPlatformFee(200)
        ).to.be.revertedWith("ZivyCoinFactory: caller is not the owner");
      });
    });

    describe("Fee Withdrawal", function () {
      it("should allow owner to withdraw accumulated fees", async function () {
        // Setup: launch coin, purchase, spend to generate fees
        await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
        const coinAddr = await factory.getCoinByExpert(expert1.address);

        const buyAmount = ethers.parseEther("1000");
        const usdtCost = (buyAmount * COIN_PRICE) / ethers.parseEther("1");
        await mockUsdt.connect(seeker1).approve(await factory.getAddress(), usdtCost);
        await factory.connect(seeker1).purchaseCoins(coinAddr, buyAmount);
        await factory.connect(owner).spendCoins(coinAddr, seeker1.address, buyAmount, "video_call");

        const expectedFee = (usdtCost * 500n) / 10000n;
        const factoryBalance = await mockUsdt.balanceOf(await factory.getAddress());
        expect(factoryBalance).to.equal(expectedFee);

        // Withdraw
        const ownerBefore = await mockUsdt.balanceOf(owner.address);
        await factory.connect(owner).withdrawFees(owner.address);
        const ownerAfter = await mockUsdt.balanceOf(owner.address);

        expect(ownerAfter - ownerBefore).to.equal(expectedFee);
        expect(await mockUsdt.balanceOf(await factory.getAddress())).to.equal(0);
      });

      it("should revert if no fees to withdraw", async function () {
        await expect(
          factory.connect(owner).withdrawFees(owner.address)
        ).to.be.revertedWith("ZivyCoinFactory: no fees to withdraw");
      });

      it("should revert if non-owner tries to withdraw", async function () {
        await expect(
          factory.connect(expert1).withdrawFees(expert1.address)
        ).to.be.revertedWith("ZivyCoinFactory: caller is not the owner");
      });
    });
  });

  describe("View Helpers", function () {
    it("getUsdtCost should return correct cost", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      const coinAddr = await factory.getCoinByExpert(expert1.address);

      const coinAmount = ethers.parseEther("500"); // 500 coins
      const expectedCost = (coinAmount * COIN_PRICE) / ethers.parseEther("1"); // 5 USDT = 5,000,000

      expect(await factory.getUsdtCost(coinAddr, coinAmount)).to.equal(expectedCost);
    });

    it("getUsdtCost should revert for invalid coin", async function () {
      await expect(
        factory.getUsdtCost(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("ZivyCoinFactory: invalid coin");
    });

    it("allCoins array should track all launched coins", async function () {
      await factory.connect(expert1).launchCoin("Alex Coin", "ALEX");
      await factory.connect(expert2).launchCoin("Sarah Coin", "SARAH");

      expect(await factory.allCoins(0)).to.equal(await factory.getCoinByExpert(expert1.address));
      expect(await factory.allCoins(1)).to.equal(await factory.getCoinByExpert(expert2.address));
    });
  });

  describe("MockUSDT", function () {
    it("should have 6 decimals", async function () {
      expect(await mockUsdt.decimals()).to.equal(6);
    });

    it("should allow anyone to mint (testnet)", async function () {
      const [, , , , , randomUser] = await ethers.getSigners();
      await mockUsdt.mint(randomUser.address, 1000000);
      expect(await mockUsdt.balanceOf(randomUser.address)).to.equal(1000000);
    });

    it("should have correct name and symbol", async function () {
      expect(await mockUsdt.name()).to.equal("Mock Tether USD");
      expect(await mockUsdt.symbol()).to.equal("USDT");
    });
  });
});
