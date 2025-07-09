// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Tracker {
    struct Item {
        uint256 id; // Unique identifier for the item
        string name; // A name or description
        address owner; // The Ethereum address of the current owner
    }
    mapping(uint256 => Item) public items;
    uint256 private _currentItemId;
    event ItemRegistered(uint256 indexed id, address indexed owner, string name);
    event OwnershipTransferred(uint256 indexed id, address indexed from, address indexed to);

    function registerItem(string memory _name) public {
        uint256 newId = _currentItemId;
        
        // Create the item and set the caller as the owner
        items[newId] = Item(newId, _name, msg.sender);
        
        // Emit the event to notify the outside world
        emit ItemRegistered(newId, msg.sender, _name);
        
        // Increment the counter for the next item
        _currentItemId++;
    }

    function transferOwnership(uint256 _id, address _newOwner) public {
        // 1. Check: Ensure the person calling this function is the current owner.
        // If this condition is false, the transaction will fail with the error message.
        require(items[_id].owner == msg.sender, "You are not the owner of this item.");
        
        // 2. Effects: Update the state variables.
        address oldOwner = items[_id].owner;
        items[_id].owner = _newOwner;
        
        // 3. Interaction: Emit the event.
        emit OwnershipTransferred(_id, oldOwner, _newOwner);
    }
}