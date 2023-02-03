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
    // deploying file-coin to BSC
    console.log("starting")
    const FileCoinBSC = await ethers.getContractFactory("FooSwapToken", BSC_SIGNER_WALLET);
    const fileCoinBSC = await FileCoinBSC.deploy();
    await fileCoinBSC.deployed();

    console.log("Token", fileCoinBSC.address);

    // deploying the vault contract for BSC
    const VaultBSC = await ethers.getContractFactory("FooswapVaultBridgeBSC", BSC_SIGNER_WALLET);
    const vaultBSC = await VaultBSC.deploy();
    await vaultBSC.deployed();

    console.log("BSC vault", vaultBSC.address)


    // supporting the file-coin token in the the BSC vault 
    await vaultBSC.addTokenToBridge("0x2000000000000000000000000000000000000000", fileCoinBSC.address);

    // adding liquidity 
    await fileCoinBSC.approve(vaultBSC.address, ethers.utils.parseEther("20"));
    await vaultBSC.addERC20Liquidity(fileCoinBSC.address, ethers.utils.parseEther("20"));

    // setting node manager
    await vaultBSC.setNodeManager("0xb4820A3b2D7c69428dDbb3f8d4a0444e8ed0063f");

    // sending ethers to the node manager 
    const tx = {
        to: "0xb4820A3b2D7c69428dDbb3f8d4a0444e8ed0063f",
        value: ethers.utils.parseEther("100")
    }

    await BSC_SIGNER_WALLET.sendTransaction(tx)
        .then(data => {
            console.log("100 ethers has been sent")
        })
        .catch(err => {
            console.log("an error ocurred while sending ethers")
        })

    // deploying the vault contract FVM
    const VaultFVM = await ethers.getContractFactory("FooswapVaultBridgeFVM", FVM_SIGNER_WALLET);
    const vaultFVM = await VaultFVM.deploy()
    await vaultFVM.deployed();

    console.log("2", vaultFVM.address);

    // supporting the file-coin token in the the BSC vault 
    await vaultFVM.addTokenToBridge(fileCoinBSC.address, "0x2000000000000000000000000000000000000000");


    // adding liquidity 
    const tx2 = {
        to: vaultFVM.address,
        value: ethers.utils.parseEther("20")
    }

    await FVM_SIGNER_WALLET.sendTransaction(tx2)
        .then(data => {
            console.log("20 ethers has been sent")
        })
        .catch(err => {
            console.log("an error ocurred while sending ethers", err)
        })

    // setting node manager
    await vaultFVM.setNodeManager("0xb4820A3b2D7c69428dDbb3f8d4a0444e8ed0063f");
}

main();



// simulation successful :)😊😎
