const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZivyCoin", function () {
  let coin, mockUsdt, platform, expert, seeker1, seeker2;

  beforeEach(async function () {
    [platform, expert, seeker1, seeker2] = await ethers.getSigners();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUsdt = await MockUSDT.deploy();

    const ZivyCoin = await ethers.getContractFactory("ZivyCoin");
    coin = await ZivyCoin.deploy(
      "Alex Coin",
      "ALEX",
      platform.address,
      expert.address,
      await mockUsdt.getAddress()
    );
  });

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await coin.name()).to.equal("Alex Coin");
      expect(await coin.symbol()).to.equal("ALEX");
    });

    it("should set correct platform, expert, and USDT addresses", async function () {
      expect(await coin.platform()).to.equal(platform.address);
      expect(await coin.expert()).to.equal(expert.address);
      expect(await coin.usdtToken()).to.equal(await mockUsdt.getAddress());
    });

    it("should have 18 decimals", async function () {
      expect(await coin.decimals()).to.equal(18);
    });

    it("should have COIN_PRICE of 10000 (0.01 USDT in 6 decimals)", async function () {
      expect(await coin.COIN_PRICE()).to.equal(10000);
    });

    it("should start with zero total supply", async function () {
      expect(await coin.totalSupply()).to.equal(0);
    });

    it("should revert if platform address is zero", async function () {
      const ZivyCoin = await ethers.getContractFactory("ZivyCoin");
      await expect(
        ZivyCoin.deploy("Test", "TST", ethers.ZeroAddress, expert.address, await mockUsdt.getAddress())
      ).to.be.revertedWith("ZivyCoin: zero platform address");
    });

    it("should revert if expert address is zero", async function () {
      const ZivyCoin = await ethers.getContractFactory("ZivyCoin");
      await expect(
        ZivyCoin.deploy("Test", "TST", platform.address, ethers.ZeroAddress, await mockUsdt.getAddress())
      ).to.be.revertedWith("ZivyCoin: zero expert address");
    });

    it("should revert if USDT address is zero", async function () {
      const ZivyCoin = await ethers.getContractFactory("ZivyCoin");
      await expect(
        ZivyCoin.deploy("Test", "TST", platform.address, expert.address, ethers.ZeroAddress)
      ).to.be.revertedWith("ZivyCoin: zero USDT address");
    });
  });

  describe("Minting", function () {
    it("should allow platform to mint coins", async function () {
      const amount = ethers.parseEther("100");
      await coin.connect(platform).mint(seeker1.address, amount);
      expect(await coin.balanceOf(seeker1.address)).to.equal(amount);
      expect(await coin.totalSupply()).to.equal(amount);
    });

    it("should emit CoinsPurchased event on mint", async function () {
      const amount = ethers.parseEther("100");
      // 100 coins * 10000 / 1e18 = 0.001 USDT (1000 in 6-decimal units)
      const expectedUsdt = (amount * 10000n) / ethers.parseEther("1");
      await expect(coin.connect(platform).mint(seeker1.address, amount))
        .to.emit(coin, "CoinsPurchased")
        .withArgs(seeker1.address, amount, expectedUsdt);
    });

    it("should revert if non-platform tries to mint", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        coin.connect(seeker1).mint(seeker1.address, amount)
      ).to.be.revertedWith("ZivyCoin: caller is not the platform");
    });

    it("should revert if expert tries to mint", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        coin.connect(expert).mint(seeker1.address, amount)
      ).to.be.revertedWith("ZivyCoin: caller is not the platform");
    });

    it("should allow minting to multiple seekers", async function () {
      await coin.connect(platform).mint(seeker1.address, ethers.parseEther("50"));
      await coin.connect(platform).mint(seeker2.address, ethers.parseEther("30"));
      expect(await coin.balanceOf(seeker1.address)).to.equal(ethers.parseEther("50"));
      expect(await coin.balanceOf(seeker2.address)).to.equal(ethers.parseEther("30"));
      expect(await coin.totalSupply()).to.equal(ethers.parseEther("80"));
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await coin.connect(platform).mint(seeker1.address, ethers.parseEther("100"));
    });

    it("should allow platform to burn coins", async function () {
      await coin.connect(platform).burn(seeker1.address, ethers.parseEther("30"), "dm");
      expect(await coin.balanceOf(seeker1.address)).to.equal(ethers.parseEther("70"));
      expect(await coin.totalSupply()).to.equal(ethers.parseEther("70"));
    });

    it("should emit CoinsBurned event", async function () {
      const amount = ethers.parseEther("30");
      await expect(coin.connect(platform).burn(seeker1.address, amount, "video_call"))
        .to.emit(coin, "CoinsBurned")
        .withArgs(seeker1.address, amount, "video_call");
    });

    it("should revert if non-platform tries to burn", async function () {
      await expect(
        coin.connect(seeker1).burn(seeker1.address, ethers.parseEther("10"), "dm")
      ).to.be.revertedWith("ZivyCoin: caller is not the platform");
    });

    it("should revert if burning more than balance", async function () {
      await expect(
        coin.connect(platform).burn(seeker1.address, ethers.parseEther("200"), "dm")
      ).to.be.reverted;
    });

    it("should allow burning entire balance", async function () {
      await coin.connect(platform).burn(seeker1.address, ethers.parseEther("100"), "dm");
      expect(await coin.balanceOf(seeker1.address)).to.equal(0);
      expect(await coin.totalSupply()).to.equal(0);
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await coin.connect(platform).mint(seeker1.address, ethers.parseEther("100"));
    });

    it("should allow transfers between users", async function () {
      await coin.connect(seeker1).transfer(seeker2.address, ethers.parseEther("25"));
      expect(await coin.balanceOf(seeker1.address)).to.equal(ethers.parseEther("75"));
      expect(await coin.balanceOf(seeker2.address)).to.equal(ethers.parseEther("25"));
    });

    it("should allow approved transfers (transferFrom)", async function () {
      await coin.connect(seeker1).approve(seeker2.address, ethers.parseEther("40"));
      await coin.connect(seeker2).transferFrom(seeker1.address, seeker2.address, ethers.parseEther("40"));
      expect(await coin.balanceOf(seeker1.address)).to.equal(ethers.parseEther("60"));
      expect(await coin.balanceOf(seeker2.address)).to.equal(ethers.parseEther("40"));
    });

    it("should revert transfer if insufficient balance", async function () {
      await expect(
        coin.connect(seeker1).transfer(seeker2.address, ethers.parseEther("200"))
      ).to.be.reverted;
    });

    it("should not change total supply on transfer", async function () {
      const supplyBefore = await coin.totalSupply();
      await coin.connect(seeker1).transfer(seeker2.address, ethers.parseEther("50"));
      expect(await coin.totalSupply()).to.equal(supplyBefore);
    });
  });
});
