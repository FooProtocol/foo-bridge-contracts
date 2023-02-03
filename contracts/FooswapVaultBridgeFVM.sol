// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";

import "./controllers/IERC20.controller.sol";
import {SafeERC20} from "./providers/safeERC20.provider.sol";


/// @notice this is FOO swap bridge conract
/// @dev this contract would be deployed on the chains that the bridge is going to be working on
/// @author Adebara123 
contract FooswapVaultBridgeFVM {
    // ===========================
    // CONSTANTS
    // ===========================
    address constant nativeTokenPlaceholder = 0x2000000000000000000000000000000000000000;


    // ===========================
    // CORE PROVIDERS
    // ===========================
    using SafeERC20 for IERC20;


    // ============================
    // STATE VARIABLE
    // ============================
    uint totalBridgeFee;
    uint public bridgeFee;
    address public vaultAdmin;
    address public nodeManager;
    mapping(address => address) public supportedTokens; // (token_address_bsc, token_address_fvm)


    // =============================
    // EVENTS
    // =============================
    event AddSupportedToken(address indexed _tokenBSC, address indexed _tokenFVM, uint256 _timestamp);
    event NewVaultAdmin(address indexed _newAdmin, uint256 _timestamp);
    event NewNodeManager(address indexed _newAdmin, uint256 _timestamp);
    event GenericToken(address indexed _to, address indexed _tokenAddress, uint256 _amount, uint256 _timestamp); // event to send generic tokens
    event TokenDeposted (address indexed _tokenDeposited, address indexed from, uint256 _amount, uint256 _timestamp);
    event TokenTransfered(address indexed _tokenAddress, address indexed from, address indexed _to, uint256 _amount, uint256 _timestamp);
    event LiquidityProvided(address lp, address token, uint256 amount);


    constructor() {
        vaultAdmin = msg.sender;
    }

    // ***************** //
    // WRITE FUNCTIONS
    // ***************** //


    /// @notice this function is the function used to add token to the bridge
    /// @dev this function would be guided with address zero check and amount must be greater than zero
    /// @param _tokenBSC: this is the address of the token you want on the BSC chian
    /// @param _tokenFVM: this is the address of the token you want on the FVM chian
    function addTokenToBridge(
        address _tokenBSC, 
        address _tokenFVM
    ) 
        external 
    {
        addressZeroCheck(_tokenBSC);
        addressZeroCheck(_tokenFVM);
        vaultAdminCheck();

        supportedTokens[_tokenBSC] = _tokenFVM;
        emit AddSupportedToken(_tokenBSC, _tokenFVM, block.timestamp);
    }

    /// @notice this function would be used to check if a token is supported
    function isTokenSupported(
        address _token
    )
        public 
        view 
        returns (
            bool supported_
        )
    {
        supported_ = supportedTokens[_token] == address(0) ? false : true;
    }

    /// @notice this function is the function used to set the vault admin
    /// @dev this function would be guided with address zero check and vault admin check
    /// @param _newAdmin: this is the address of the new vault admin
    function setVaultAdmin(
        address _newAdmin
    ) 
        external 
    {
        addressZeroCheck(_newAdmin);
        vaultAdminCheck();

        vaultAdmin = _newAdmin;
        emit NewVaultAdmin(_newAdmin, block.timestamp);
    }

    /// @notice this function is the function used to set the node manager
    /// @dev this function would be guided with address zero check and vault admin check
    /// @param _nodeManager: this is the address of the new node manager
    function setNodeManager(
        address _nodeManager
    ) 
        external 
    {
        addressZeroCheck(_nodeManager);
        vaultAdminCheck();

        nodeManager = _nodeManager;
        emit NewNodeManager(_nodeManager, block.timestamp);
    }

    /// @notice this is the function used to check liquidity
    /// @dev this function would be guided with address must be greater than zero
    /// @param _tokenAddress: this is the contract address you want to check
    /// @param _amount: this is the amount you want to check
    function checkLiquidity(
        address _tokenAddress, 
        uint256 _amount
    ) 
        external 
        view 
        returns(
            bool liquidityStatus
        ) 
    {
        if(isTokenSupported(_tokenAddress)) {
            liquidityStatus = objectivelyObtainTokenBalance(supportedTokens[_tokenAddress]) < _amount ? false : true;
        } else {
            liquidityStatus = false;
        }
    }

    /// @notice This function is used to deposit native token into the vault
    /// @dev This function can be called to when a bridge is about to happen [nativeTokenPlaceholder is used to tell the relayer node that it is the native token (FVM) that was sent]
    function depositNativeTokenIntoVault ()
         external 
         payable
    {
        amountMustBeGreaterThanZero(msg.value);
        emit TokenDeposted(nativeTokenPlaceholder, msg.sender, msg.value, block.timestamp);
    }

    /// @notice This function is used to deposit generic ERC20 tokens
    /// @dev This function can be called to when a bridge is about to happen
    /// @param _ERCtoken: this is the address of the ERC20token you are depositing into the vault
    /// @param _amount: this is the amount of token deposited into the vault
    

    function depositERC20Token (
         IERC20 _ERCtoken,
         uint _amount) 
         public 
    {
        addressZeroCheck(address(_ERCtoken));
        amountMustBeGreaterThanZero(_amount);
        _ERCtoken.safeTransferFrom(msg.sender, address(this), _amount);
        emit TokenDeposted(address(_ERCtoken), msg.sender, _amount, block.timestamp);
    }


    /// @notice This function is called by the node to transfer out token durring a bridge
    /// @dev This function can be called during bridging and only the node manager can call this function
    /// @param _ERCtoken: this is the address of the ERC20 trnasfered out of the vault 
    /// @param _to: this is the amount of token deposited into the vault
    /// @param _amount: this is the amount of token deposited into the vault
    function nodeTransferTokenOut (
        address _ERCtoken,
        address _to,
        uint _amount)
         public
        {
        require(msg.sender == nodeManager, "Address not nodeManager");
        addressZeroCheck( _to);
        amountMustBeGreaterThanZero(_amount);
        uint amount = _amount - (bridgeFee * 1e18);
        IERC20 exchangeToken = IERC20(supportedTokens[_ERCtoken]);
        require(address(exchangeToken) != address(0), "Unsupported token");

        if(address(exchangeToken) == nativeTokenPlaceholder) {
            (bool sent, ) = payable(_to).call{value: amount}("");
            require(sent, "Failed to send Fil out");
        } else {
            exchangeToken.safeTransfer(_to, amount); 
        }
          
        totalBridgeFee += bridgeFee;
        emit TokenTransfered(address(_ERCtoken), msg.sender, address(this), amount, block.timestamp);
    }

    
    /// @notice this function would be used to add token to this vault that would be used for liquidity
    /// @dev function should store the liquidity providers for reward distrubtion
    /// @param _ERCtoken: this is the address of the token that liquidity id been provided for 
    /// @param _amount: this is the amount of this token liquidity is been provided 
    function addERC20Liquidity  (
        IERC20 _ERCtoken,
        uint256 _amount
    ) 
        public
    {
        addressZeroCheck(address(_ERCtoken));
        amountMustBeGreaterThanZero(_amount);
        _ERCtoken.safeTransferFrom(msg.sender, address(this), _amount);
        emit LiquidityProvided(msg.sender, address(_ERCtoken), _amount);
    }

    /// @notice this is the function that would be used to added liquidity for native 
    /// @dev this function shoukd record the liquidity providers for reward distrubution 
    function addLiquidityNative () 
        public 
        payable
    {
        amountMustBeGreaterThanZero(msg.value);
        emit LiquidityProvided(msg.sender, nativeTokenPlaceholder, msg.value);
    }

    /// @notice this function would be used by the admin to pull out tokens and fees 
    /// @dev this function would be guarded
    /// @param _token: this is the address of the token that is to be pulled out 
    /// @param _amount: this is the amount of tokens that is to be pulled put from this contract
    function adminPullOutToken(
        IERC20 _token,
        uint256 _amount,
        address _to
    )
        external
    {
        addressZeroCheck(address(_token));
        addressZeroCheck(_to);
        amountMustBeGreaterThanZero(_amount);
        vaultAdminCheck();

        _token.safeTransfer(_to, _amount);
    }

    /// @notice this function would be used to pull out native token from this contract
    /// @dev this function should be guarded (out admin should b able to access tyhis function )
    function adminPullOutNative(
        uint256 _amount,
        address _to
    ) 
        external 
    {
        addressZeroCheck(_to);
        amountMustBeGreaterThanZero(_amount);
        vaultAdminCheck();

        (bool sent, ) = payable(_to).call{value: _amount}("");
        require(sent, "Failed to send Fil out");
    }

    /// @notice This function is called by the admin to cange the bridge fee
    /// @dev This function can only be called by the bridge admin
    /// @param _fee: this is the new fee set by the admin 

    function setBridgeFee (uint _fee) external {
        vaultAdminCheck();
        bridgeFee = _fee;
    }

    receive() external payable {}


    // ***************** //
    // INTERNAL FUNCTIONS
    // ***************** //

    /// @notice this is the internal function used to check vault admin
    function vaultAdminCheck() internal view {
        require(msg.sender == vaultAdmin, "Only the current vault admin can perform this operation.");
    }

    /// @notice this is the internal function used to check address zero
    /// @param _addr: this is the address you want to check again address zero
    function addressZeroCheck(address _addr) internal pure {
        require(_addr != address(0), "No address zero allowed");
    }

    /// @notice this is the internal function used to check that address must be greater than zero
    /// @param _amount: this is the amount you want to check
    function amountMustBeGreaterThanZero(uint _amount) internal pure {
        require(_amount > 0, "Amount must be greater than zero");
    }

    /// @notice this function would be used to check for a token balnce in this vault
    /// @param _token: this is the token of which balance is to be atained 
    function objectivelyObtainTokenBalance(
        address _token
    ) 
        internal
        view
        returns(
            uint256 bal
        )
    {
        bal = IERC20(_token).balanceOf(address(this));
    }
   
}