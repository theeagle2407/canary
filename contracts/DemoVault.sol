// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;
/// @notice Controlled demo only. No deposits or real customer funds.
contract DemoVault {
    address public immutable owner = msg.sender;
    bool public paused;
    uint256 public reserveUnits = 1000;
    function setPaused(bool value) external { require(msg.sender == owner, "owner only"); paused = value; }
    function setReserveUnits(uint256 value) external { require(msg.sender == owner, "owner only"); reserveUnits = value; }
    function broken() external pure returns (uint256) { revert("probe error"); }
    function wrongShape() external pure returns (uint256, uint256) { return (1,2); }
}
