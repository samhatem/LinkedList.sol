// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../LinkedList.sol";

contract LinkedListTest {
    using LinkedList for LinkedList.AddressList;

    LinkedList.AddressList public addresses;

    // solhint-disable-next-line var-name-mixedcase
    address public SENTINEL = address(0x1);

    constructor(address[] memory _addressesArr) {
        addresses.setupList(_addressesArr);
    }

    function getAddresses() public view returns (address[] memory) {
        return addresses.toArray();
    }

    function isMember(address who) public view returns (bool) {
        return addresses.isMember(who);
    }

    function swap(
        address prev,
        address old,
        address _new
    ) public {
        addresses.swap(prev, old, _new);
    }

    function remove(address prev, address item) public {
        addresses.remove(prev, item);
    }

    function insert(address item) public {
        addresses.insert(item);
    }

    function count() public view returns (uint256) {
        return addresses.count;
    }
}