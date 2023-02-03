import { ethers } from "hardhat";


const FVM_PROVIDER_URI = "http://127.0.0.1:8546"; // ganache
const BSC_PROVIDER_URI = "http://127.0.0.1:8545"; // hardhat


const FVM_PROVIDER = new ethers.providers.JsonRpcProvider(FVM_PROVIDER_URI);
const BSC_PROVIDER = new ethers.providers.JsonRpcProvider(BSC_PROVIDER_URI);

const FVM_PRIVATE_KEY = "0x9cc90c777c406c9e40f527a4e23d16405205f9d9886b6c75cee60a074da930ea";
const BSC_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const FVM_SIGNER_WALLET = new ethers.Wallet(FVM_PRIVATE_KEY, FVM_PROVIDER);
const BSC_SIGNER_WALLET = new ethers.Wallet(BSC_PRIVATE_KEY, BSC_PROVIDER);

async function main() {
    const vaultBSC = await ethers.getContractAt("FooswapVaultBridgeBSC", "0xcA03Dc4665A8C3603cb4Fd5Ce71Af9649dC00d44", BSC_SIGNER_WALLET);
    const fileCoin = await ethers.getContractAt("FooSwapToken", "0x90118d110B07ABB82Ba8980D1c5cC96EeA810d2C", BSC_SIGNER_WALLET);

    // approving
    await fileCoin.approve(vaultBSC.address, ethers.utils.parseEther("1"));

    // depositing
    await vaultBSC.depositERC20Token(fileCoin.address, ethers.utils.parseEther("1"));



}

main();