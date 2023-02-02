// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface MappingContract {
        function addContract(address _contract) external;
    }

contract MultiSig {
    address[] public owners;
    mapping(address=>bool) public isOwner;
    uint public required;
    uint public transactionCount;
    enum status{NOTAPPROVED,APPROVED, EXECUTED }

    struct Transaction {
        address to;
        uint256 value;
        status executed;
        uint confirmCount;
        bytes data;
    }

    mapping(uint=>Transaction) public transactions;
    mapping(uint=>mapping(address=>bool)) public confirmations;
    MappingContract Mapping;
    


    constructor(address[] memory _owners, uint _required,address _mappingContract) {
        require(_owners.length > 0);
        require(_required > 0);
        require(_required <= _owners.length);
        owners = _owners;
        required = _required;
        for(uint i=0;i<_owners.length;i++){
            isOwner[_owners[i]]=true;
        }
        Mapping = MappingContract(_mappingContract);
        Mapping.addContract(address(this));
    }

    function addTransaction(address _to,uint256 _value,bytes calldata _data) internal returns(uint256){
        uint transactionId=transactionCount;
        transactions[transactionId] = Transaction(_to, _value, status.NOTAPPROVED,0,_data);
        transactionCount+=1;
        return transactionId;
    }

   

    function confirmTransaction(uint _txid) public {
        require(isOwner[msg.sender],"not owner");
        require(confirmations[_txid][msg.sender]==false,"already confirmed");
        confirmations[_txid][msg.sender]=true;
        transactions[_txid].confirmCount+=1;
        if(isConfirmed(_txid)){
        transactions[_txid].executed=status.APPROVED;}
        
    }

    function getConfirmationsCount(uint _txid) public view returns(uint){
        return transactions[_txid].confirmCount;
    }

    function submitTransaction(address _to,uint _value, bytes calldata _data) external{
        uint txid=addTransaction(_to,_value,_data);
        confirmTransaction(txid);
    }

    function isConfirmed(uint _txid) public view returns(bool){
        return(transactions[_txid].confirmCount>=required);
    }

    // function executeTransaction(uint _txid) public{
    //     require(transactions[_txid].executed==status.APPROVED);
    //     // (bool success,) = transactions[_txid].to.call{ value: transactions[_txid].value }(transactions[_txid].data);
    //     // require(success, "Failed to execute transaction");
    //     transactions[_txid].executed=status.EXECUTED;
    // }

    function executeTransaction(uint _txid) public {
        require(transactions[_txid].executed==status.APPROVED,"transaction not approved");
        Transaction storage _tx = transactions[_txid];
        require(address(this).balance>=_tx.value,"not enough fund to execute transaction");
        (bool success, ) = _tx.to.call{ value: _tx.value }(_tx.data);
        require(success, "Failed to execute transaction");
        _tx.executed = status.EXECUTED;
    }

    receive() external payable{}

    function transferOwner(address _to) public{
        for(uint i=0;i<owners.length;i++){
            if(owners[i]==msg.sender){
                owners[i]=_to;
            }
        }
    }

    function getOwners() external view returns(address[] memory){
        return(owners);
    }

    function changeOwner(address _newowner) external {
        require(isOwner[msg.sender],"you are not owner");
        for(uint i=0;i<owners.length;i++){
            if(owners[i]==msg.sender){
                owners[i]=_newowner;
                isOwner[_newowner]=true;
                isOwner[msg.sender]=false;
            }
        }
    }
    
 
}
