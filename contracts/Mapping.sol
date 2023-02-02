// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Mapping {
    address[] public Contracts;
    function addContract(address _contract) external {
        Contracts.push(_contract);
    }
    function checkContracts() external view returns(address[] memory){
        return Contracts;
    }
}
