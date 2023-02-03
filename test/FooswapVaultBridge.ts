const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("FooswapVaultBridge", function () {
    async function deployVaultBridgeContract() {

        const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("FooSwapToken");
        const token = await Token.deploy();

        const SwapVaultBridge = await ethers.getContractFactory("FooswapVaultBridgeFVM");
        const swapVaultBridge = await SwapVaultBridge.deploy();

        return { swapVaultBridge, token, owner, otherAccount, thirdAccount };
    }

    describe("Deployment done properly", function () {
        it("Should set the right Owner", async function () {
            const { swapVaultBridge, owner } = await loadFixture(deployVaultBridgeContract);

            expect(await swapVaultBridge.vaultAdmin()).to.equal(owner.address);
        });

        it("Should assign the total supply of token minted to the admin", async function () {
            const { token } = await loadFixture(deployVaultBridgeContract);

            const ownerBalance = await token.balanceOf(token.admin());

            expect(await token.totalSupply()).to.equal(ownerBalance);
        })
    });

    describe("Add token to bridge vault", function () {
        it("adds token to the bridge successfully", async () => {
            const { swapVaultBridge, token } = await loadFixture(deployVaultBridgeContract);

            await swapVaultBridge.addTokenToBridge(token.address, "0x2223bF1D7c19EF7C06DAB88938EC7B85952cCd89");

            expect(await swapVaultBridge.supportedTokens(token.address)).to.be.equal("0x2223bF1D7c19EF7C06DAB88938EC7B85952cCd89", "Final token balance should be 100");
        });

        

        it("adds token to the bridge fails when the address is address zero", async () => {
            const { swapVaultBridge, token } = await loadFixture(deployVaultBridgeContract);
            await expect(swapVaultBridge.addTokenToBridge(ethers.constants.AddressZero, ethers.constants.AddressZero)).to.be.revertedWith("No address zero allowed");
        });

        it("Should emit AddToken", async function () {
            const { swapVaultBridge, token } = await loadFixture(deployVaultBridgeContract);

            await expect(swapVaultBridge.addTokenToBridge(token.address, "0x2223bF1D7c19EF7C06DAB88938EC7B85952cCd89"))
                .to.emit(swapVaultBridge, "AddSupportedToken");
        });
    })

    describe("Set Vault Admin", function () {
        it("set vault admin fails when the address is address zero", async () => {
            const { swapVaultBridge } = await loadFixture(deployVaultBridgeContract);

            await expect(swapVaultBridge.setVaultAdmin(ethers.constants.AddressZero)).to.be.revertedWith("No address zero allowed");
        });

        it("can set vault admin by the owner", async () => {
            const { swapVaultBridge, otherAccount } = await loadFixture(deployVaultBridgeContract);

            await swapVaultBridge.setVaultAdmin(otherAccount.address);

            expect(await swapVaultBridge.vaultAdmin()).to.be.equal(otherAccount.address, "Vault admin should be set properly");
        });

        it("cannot set vault admin by a non-owner", async () => {
            const { swapVaultBridge, otherAccount } = await loadFixture(deployVaultBridgeContract);

            await expect(swapVaultBridge.connect(otherAccount).setVaultAdmin(otherAccount.address)).to.be.revertedWith("Only the current vault admin can perform this operation.");
        });

        it("Should emit NewVaultAdmin", async function () {
            const { swapVaultBridge, owner } = await loadFixture(deployVaultBridgeContract);

            const currentTime = await time.latest() + 1;

            await expect(swapVaultBridge.setVaultAdmin(owner.address))
                .to.emit(swapVaultBridge, "NewVaultAdmin")
                .withArgs(owner.address, currentTime);
        });
    })

    describe("Set Node Manager", function () {
        it("set node manager fails when the address is address zero", async () => {
            const { swapVaultBridge } = await loadFixture(deployVaultBridgeContract);

            await expect(swapVaultBridge.setNodeManager(ethers.constants.AddressZero)).to.be.revertedWith("No address zero allowed");
        });

        it("can set node manager by the vault admin", async () => {
            const { swapVaultBridge, otherAccount } = await loadFixture(deployVaultBridgeContract);

            await swapVaultBridge.setNodeManager(otherAccount.address);

            expect(await swapVaultBridge.nodeManager()).to.be.equal(otherAccount.address, "Vault admin should be set properly");
        });

        it("cannot set node manager by a non vault admin", async () => {
            const { swapVaultBridge, owner, otherAccount } = await loadFixture(deployVaultBridgeContract);

            await swapVaultBridge.setVaultAdmin(otherAccount.address); // another address has been set as vault admin here

            await expect(swapVaultBridge.connect(owner).setNodeManager(owner.address)).to.be.revertedWith("Only the current vault admin can perform this operation.");
        });

        it("Should emit NewNodeManager", async function () {
            const { swapVaultBridge, owner } = await loadFixture(deployVaultBridgeContract);

            const currentTime = await time.latest() + 1;

            await expect(swapVaultBridge.setNodeManager(owner.address))
                .to.emit(swapVaultBridge, "NewNodeManager")
                .withArgs(owner.address, currentTime);
        });
    })

    describe("Send Generic Token", function () {
        it("send generic token fails when the address is address zero", async () => {
            const { swapVaultBridge, token } = await loadFixture(deployVaultBridgeContract);

            await expect(swapVaultBridge.sendGenericToken(ethers.constants.AddressZero, token.address, 300)).to.be.revertedWith("ERC20: transfer to address zero not allowed");
        });

        // it("send generic token fails when not initiated by vault admin", async () => {
        //     const { swapVaultBridge, token, owner, otherAccount } = await loadFixture(deployVaultBridgeContract);

        //     await token.transfer(swapVaultBridge.address, 2000);
        //     await swapVaultBridge.addTokenToBridge(token.address, 1000);

        //     expect(await swapVaultBridge.connect(otherAccount).sendGenericToken(owner.address, token.address, 50)).to.be.revertedWith("Only the current vault admin can perform this operation.");
        // });

        it("send generic token out", async function () {
            const { swapVaultBridge, otherAccount, token } = await loadFixture(deployVaultBridgeContract);

            await token.transfer(swapVaultBridge.address, 2000);
            await swapVaultBridge.sendGenericToken(otherAccount.address, token.address, 1800);

            expect(await token.balanceOf(otherAccount.address)).to.equal(1800);
        })

        it("Should emit GenericToken", async function () {
            const { swapVaultBridge, token, otherAccount } = await loadFixture(deployVaultBridgeContract);

            const currentTime = await time.latest() + 2;
            await token.transfer(swapVaultBridge.address, 2000);

            await expect(swapVaultBridge.sendGenericToken(otherAccount.address, token.address, 100))
                .to.emit(swapVaultBridge, "GenericToken")
                .withArgs(otherAccount.address, token.address, 100, currentTime);
        });
    })

    describe("Check Liquidity", function () {
        it("check liquidity returns true when there is enough token", async () => {
            const { swapVaultBridge, token } = await loadFixture(deployVaultBridgeContract);

            await swapVaultBridge.addTokenToBridge("0x2223bF1D7c19EF7C06DAB88938EC7B85952cCd89", token.address);

            await token.transfer(swapVaultBridge.address, ethers.utils.parseEther("2"));

            expect(await swapVaultBridge.checkLiquidity("0x2223bF1D7c19EF7C06DAB88938EC7B85952cCd89", ethers.utils.parseEther("1"))).to.be.true;
        });

        it("check liquidity returns false when there is not enough token", async () => {
            const { swapVaultBridge, token } = await loadFixture(deployVaultBridgeContract);

            await swapVaultBridge.addTokenToBridge("0x2223bF1D7c19EF7C06DAB88938EC7B85952cCd89", token.address);

            await token.transfer(swapVaultBridge.address, ethers.utils.parseEther("2"));

            expect(await swapVaultBridge.checkLiquidity(token.address, ethers.utils.parseEther("2000"))).to.be.false;
        });

        it("check liquidity reverts when token address is not found", async () => {
            const { swapVaultBridge, token } = await loadFixture(deployVaultBridgeContract);

            await swapVaultBridge.addTokenToBridge("0x2223bF1D7c19EF7C06DAB88938EC7B85952cCd89", token.address);

            await token.transfer(swapVaultBridge.address, ethers.utils.parseEther("2"));


            expect(await swapVaultBridge.checkLiquidity("0x2000000000000000000000000000000000000000", ethers.utils.parseEther("2"))).to.be.false;
        });
    })
});