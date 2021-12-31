// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * Library based on the linked list in
 * https://github.com/gnosis/safe-contracts/blob/v1.3.0/contracts/base/OwnerManager.sol
 * Much of the code is copied directly from there.
 *
 * @dev
 */
library LinkedList {
    struct AddressList {
        // number of items in the set
        uint256 count;
        // addresses in the set.
        mapping(address => address) items;
    }

    address internal constant SENTINEL_ADDRESS = address(0x1);

    /**
     * @dev Method to setup the list.
     * IMPORTANT: This method must be called before trying to insert or remove from the list.
     *
     * @param list - the AddressList to set up
     * @param _items - the intial items to add to the list
     */
    function setupList(AddressList storage list, address[] memory _items) internal {
        address currentItem = SENTINEL_ADDRESS;
        for (uint256 i = 0; i < _items.length; i++) {
            // item address cannot be null.
            address item = _items[i];
            require(
                item != address(0) && item != SENTINEL_ADDRESS && item != address(this) && currentItem != item,
                "LinkedAddressList: new address is invalid."
            );

            // No duplicate items allowed.
            require(list.items[item] == address(0), "LinkedAddressList: no duplicate addresses allowed.");
            list.items[currentItem] = item;
            currentItem = item;
        }
        list.items[currentItem] = SENTINEL_ADDRESS;
        list.count = _items.length;
    }

    function insert(AddressList storage list, address newItem) internal {
        // new address cannot be null, the sentinel or the contract itself.
        require(
            newItem != address(0) && newItem != SENTINEL_ADDRESS && newItem != address(this),
            "LinkedAddressList: new address is invalid."
        );
        // No duplicate items allowed.
        require(list.items[newItem] == address(0), "LinkedAddressList: no duplicate addresses allowed.");

        list.items[newItem] = list.items[SENTINEL_ADDRESS];
        list.items[SENTINEL_ADDRESS] = newItem;
        list.count++;
    }

    function remove(
        AddressList storage list,
        address prevItem,
        address item
    ) internal {
        // Validate item address and check that it corresponds to item index.
        require(
            item != address(0) && item != SENTINEL_ADDRESS,
            "LinkedAddressList: cannot remove 0 address or sentinel address."
        );
        require(list.items[prevItem] == item, "LinkedAddressList: item does not correspond to the index.");

        list.items[prevItem] = list.items[item];
        list.items[item] = address(0);
        list.count--;
    }

    function swap(
        AddressList storage list,
        address prevItem,
        address oldItem,
        address newItem
    ) internal {
        // Owner address cannot be null, the sentinel or the Safe itself.
        require(
            newItem != address(0) && newItem != SENTINEL_ADDRESS && newItem != address(this),
            "LinkedAddressList: new address is invalid."
        );
        // No duplicate addresses allowed.
        require(list.items[newItem] == address(0), "LinkedAddressList: cannot add duplicate item to list.");
        // Validate oldItem address and check that it corresponds to owner index.
        require(
            oldItem != address(0) && oldItem != SENTINEL_ADDRESS,
            "LinkedAddressList: oldItem cannot be 0 address or sentinel."
        );
        require(list.items[prevItem] == oldItem, "LinkedAddressList: oldItem is not at the specified index.");

        list.items[newItem] = list.items[oldItem];
        list.items[prevItem] = newItem;
        list.items[oldItem] = address(0);
    }

    function isMember(AddressList storage list, address item) internal view returns (bool) {
        return item != SENTINEL_ADDRESS && list.items[item] != address(0);
    }

    function toArray(AddressList storage list) internal view returns (address[] memory) {
        address[] memory array = new address[](list.count);

        // populate return array
        uint256 index = 0;
        address currentOwner = list.items[SENTINEL_ADDRESS];
        while (currentOwner != SENTINEL_ADDRESS) {
            array[index] = currentOwner;
            currentOwner = list.items[currentOwner];
            index++;
        }
        return array;
    }
}