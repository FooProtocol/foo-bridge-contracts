import { ethers } from "hardhat";

async function main() {
  
  // ********Deploying FoswapVaultBridgeFVM to FVM blockchain***********
  console.log("Deploying FooswapVaultBridgeFVM to the FVM blockchai")
  const FooswapVaultBridgeFVM = await ethers.getContractFactory("FooswapVaultBridgeFVM")
  const fooswapVaultBridgeFVM = await FooswapVaultBridgeFVM.deploy()
  await fooswapVaultBridgeFVM.deployed();

  console.log(`FooswapVaultBridgeFVM has been deployed to  ${fooswapVaultBridgeFVM.address}`);


  // ********Deploying FooswapVaultBridgeBSC to the BSC blockchain***********
  console.log("Deploying FooswapVaultBridgeBSC to the BSC blockchain")
  const FooswapVaultBridgeBSC = await ethers.getContractFactory("FooswapVaultBridgeBSC")
  const fooswapVaultBridgeBSC = await FooswapVaultBridgeBSC.deploy()
  await fooswapVaultBridgeBSC.deployed()

  console.log("FooswapVaultBridgeBSC has been deployed to ", fooswapVaultBridgeBSC.address)


  // ********Deploying Token to the BSC blockchain***********

  console.log("Deploying FILEcoin to the BSC blockchain")

  const FILEcoin = await ethers.getContractFactory("FIL") 
  const filecoin = await FILEcoin.deploy()
  await filecoin.deployed()

  console.log("FILEcoin has been deployed to", filecoin.address)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
