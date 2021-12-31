/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { LinkedListTest } from "../typechain";
import { deploy, SENTINEL_ADDRESS } from "./helpers";

const setup = deployments.createFixture(async () => {
    const signers = await ethers.getSigners();
    const allAddresses = signers.map(s => s.address);
    const addresses = allAddresses.slice(0, signers.length / 2);
    const tester = await deploy<LinkedListTest>("LinkedListTest", {
        args: [addresses],
        connect: signers[1],
    });

    return {
        tester,
        allAddresses,
    };
});

const commonTests: [
    {
        test: (expectedAddresses: string[], expectedLen: number, tester: LinkedListTest) => Promise<void>;
        name: string;
    },
] = [
    {
        name: "should have expected addresses and length",
        test: async (expectedAddresses: string[], expectedLen: number, tester: LinkedListTest) => {
            const addresses = await tester.getAddresses();

            addresses.forEach((addr: string, i: number) => expect(addr).to.equal(expectedAddresses[i]));

            expect(addresses.length).to.equal(expectedLen);
        },
    },
];

commonTests.push({
    name: "has expected count",
    test: async (expectedAddresses: string[], expectedLen: number, tester: LinkedListTest) => {
        const count = await tester.count();
        const expected = expectedLen.toString();

        expect(count.toString()).to.equal(expected);
    },
});

commonTests.push({
    name: "isMember works as expected",
    test: async (expectedAddresses: string[], expectedLen: number, tester: LinkedListTest) => {
        const first = expectedAddresses[0];

        const isMember = await tester.isMember(first);

        expect(isMember).to.equal(true);
    },
});

commonTests.push({
    name: "isMember fails for random address",
    test: async (expectedAddresses: string[], expectedLen: number, tester: LinkedListTest) => {
        const randomAddr = ethers.Wallet.createRandom().address;
        const isMember = await tester.isMember(randomAddr);

        expect(isMember).to.equal(false);
    },
});

commonTests.push({
    name: "isMember fails on sentinel address",
    test: async (expectedAddresses: string[], expectedLen: number, tester: LinkedListTest) => {
        const sentinelFromContract = await tester.SENTINEL();

        expect(SENTINEL_ADDRESS).to.equal(sentinelFromContract);

        const isMember = await tester.isMember(SENTINEL_ADDRESS);
        expect(isMember).to.equal(false);
    },
});

describe("Unit tests", function () {
    describe("LinkedList", function () {
        let tester: LinkedListTest;
        let allAddresses: string[];
        let expectedArr: string[] = [];

        before(async function () {
            const deployment = await setup();
            tester = deployment.tester;
            allAddresses = deployment.allAddresses;
        });

        commonTests.forEach(test => {
            it(test.name, async () => {
                await test.test(allAddresses.slice(0, allAddresses.length / 2), allAddresses.length / 2, tester);
            });
        });

        describe("inserts members", function () {
            let newMember: string;
            let index: number;
            const insertions = 5;

            it("adds a member", async () => {
                index = allAddresses.length / 2;
                newMember = allAddresses[index];

                await tester.insert(newMember);

                const isMember = await tester.isMember(newMember);
                expect(isMember).to.equal(true);
            });

            it("fails to add member again", async () => {
                await expect(tester.insert(newMember)).to.be.revertedWith(
                    "LinkedAddressList: no duplicate addresses allowed.",
                );
            });

            it("fails to add sentinel address", async () => {
                await expect(tester.insert(SENTINEL_ADDRESS)).to.be.revertedWith(
                    "LinkedAddressList: new address is invalid.",
                );
            });

            it("fails to add the contract itself", async () => {
                await expect(tester.insert(tester.address)).to.be.revertedWith(
                    "LinkedAddressList: new address is invalid.",
                );
            });

            it("fails to add address 0", async () => {
                await expect(tester.insert(ethers.constants.AddressZero)).to.be.revertedWith(
                    "LinkedAddressList: new address is invalid.",
                );
            });

            it("adds multiple", async () => {
                let i = 0;
                // account for 1 insertion at the start
                while (i++ < insertions - 1) { // eslint-disable-line
                    await tester.insert(allAddresses[++index]); // eslint-disable-line
                }

                // no need for expect as it's covered in commonTests
            });

            it("not a test but set expected array", () => {
                for (let i = 0; i < allAddresses.length; i++) { // eslint-disable-line
                    const addr = allAddresses[i];
                    if (i < allAddresses.length / 2) {
                        expectedArr.push(addr);
                    } else if (i < allAddresses.length / 2 + insertions) {
                        expectedArr = [addr, ...expectedArr];
                    }
                }
            });

            commonTests.forEach(test => {
                it(test.name, async () => {
                    await test.test(expectedArr, expectedArr.length, tester);
                });
            });
        });

        describe("remove members", function () {
            let removedIndex: number;

            it("removes a members", async () => {
                const addresses = await tester.getAddresses();

                removedIndex = addresses.length - 5;
                const prev = addresses[removedIndex - 1];
                const item = addresses[removedIndex];

                let isMember = await tester.isMember(item);

                expect(isMember).to.equal(true);

                await tester.remove(prev, item);

                isMember = await tester.isMember(item);

                expect(isMember).to.equal(false);
            });

            it("fails to remove member with wrong previous item", async () => {
                const addresses = await tester.getAddresses();

                const index = addresses.length - 5;
                const prev = addresses[index - 2];
                const item = addresses[index];

                await expect(tester.remove(prev, item)).to.be.revertedWith(
                    "LinkedAddressList: item does not correspond to the index.",
                );
            });

            it("fails to remove address 0", async () => {
                await expect(
                    tester.remove(ethers.constants.AddressZero, ethers.constants.AddressZero),
                ).to.be.revertedWith("LinkedAddressList: cannot remove 0 address or sentinel address.");
            });

            it("fails to remove sentinel address", async () => {
                await expect(tester.remove(ethers.constants.AddressZero, SENTINEL_ADDRESS)).to.be.revertedWith(
                    "LinkedAddressList: cannot remove 0 address or sentinel address.",
                );
            });

            it("not a test. set expected array", () => {
                expectedArr = [...expectedArr.slice(0, removedIndex), ...expectedArr.slice(removedIndex + 1)];
            });

            commonTests.forEach(test => {
                it(test.name, async () => {
                    await test.test(expectedArr, expectedArr.length, tester);
                });
            });
        });

        describe("swap members", function () {
            let swapIndex: number;
            let newItem: string;

            it("allows swapping items", async () => {
                const addresses = await tester.getAddresses();

                swapIndex = addresses.length - 5;
                const prev = addresses[swapIndex - 1];
                const oldItem = addresses[swapIndex];

                newItem = ethers.Wallet.createRandom().address;

                await tester.swap(prev, oldItem, newItem);

                const isOldItemMember = await tester.isMember(oldItem);
                expect(isOldItemMember).to.equal(false);

                const isNewItemMember = await tester.isMember(newItem);
                expect(isNewItemMember).to.equal(true);

                const updatedAddresses = await tester.getAddresses();
                expect(updatedAddresses[swapIndex]).to.equal(newItem);
            });

            it("fails to swap with an item already in the list", async () => {
                const addresses = await tester.getAddresses();

                const i = addresses.length - 2;
                const prev = addresses[i - 1];
                const oldItem = addresses[i];
                const badNewItem = addresses[i - 1];

                await expect(tester.swap(prev, oldItem, badNewItem)).to.be.revertedWith(
                    "LinkedAddressList: cannot add duplicate item to list.",
                );
            });

            it("cannot swap with null address, sentinel, or the contract itself", async () => {
                const addresses = await tester.getAddresses();

                const i = addresses.length - 2;
                const prev = addresses[i - 1];
                const oldItem = addresses[i];

                await expect(tester.swap(prev, oldItem, ethers.constants.AddressZero)).to.be.revertedWith(
                    "LinkedAddressList: new address is invalid.",
                );

                await expect(tester.swap(prev, oldItem, SENTINEL_ADDRESS)).to.be.revertedWith(
                    "LinkedAddressList: new address is invalid.",
                );

                await expect(tester.swap(prev, oldItem, tester.address)).to.be.revertedWith(
                    "LinkedAddressList: new address is invalid.",
                );
            });

            it("old item cannot be 0 or sentinel address", async () => {
                const addresses = await tester.getAddresses();

                const i = addresses.length - 2;
                const prev = addresses[i - 1];

                const badNewItem = ethers.Wallet.createRandom().address;

                await expect(tester.swap(prev, ethers.constants.AddressZero, badNewItem)).to.be.revertedWith(
                    "LinkedAddressList: oldItem cannot be 0 address or sentinel.",
                );

                await expect(tester.swap(prev, SENTINEL_ADDRESS, badNewItem)).to.be.revertedWith(
                    "LinkedAddressList: oldItem cannot be 0 address or sentinel.",
                );
            });

            it("wrong index of old item", async () => {
                const addresses = await tester.getAddresses();

                const i = addresses.length - 5;
                const prev = addresses[i - 2];
                const oldItem = addresses[i];

                const item = ethers.Wallet.createRandom().address;

                await expect(tester.swap(prev, oldItem, item)).to.be.revertedWith(
                    "LinkedAddressList: oldItem is not at the specified index.",
                );
            });

            it("not a test. set expected array", () => {
                expectedArr[swapIndex] = newItem;
            });

            commonTests.forEach(test => {
                it(test.name, async () => {
                    await test.test(expectedArr, expectedArr.length, tester);
                });
            });
        });
    });
});