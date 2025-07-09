// app.js

// --- IMPORTANT ---
// 1. PASTE YOUR DEPLOYED CONTRACT ADDRESS HERE
const contractAddress = "0x0c5fc78A13637038507f4dF14801d7fA8a059F39";

// 2. PASTE YOUR CONTRACT'S ABI HERE
const contractABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            }
        ],
        "name": "ItemRegistered",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_name",
                "type": "string"
            }
        ],
        "name": "registerItem",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_id",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "items",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
// --- END IMPORTANT ---


let provider;
let signer;
let contract;

// Wait for the page to load
document.addEventListener('DOMContentLoaded', async () => {
    // Find our buttons and containers
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const registerBtn = document.getElementById('registerBtn');
    const itemsContainer = document.getElementById('itemsContainer');
    const walletAddressEl = document.getElementById('walletAddress');

    // Attach event listeners
    connectWalletBtn.addEventListener('click', connectWallet);
    registerBtn.addEventListener('click', registerItem);

    // Initial setup
    async function init() {
        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            contract = new ethers.Contract(contractAddress, contractABI, provider);
            await loadItems();
        } else {
            console.log('MetaMask is not installed!');
            itemsContainer.innerHTML = "Please install MetaMask to use this DApp.";
        }
    }

    async function connectWallet() {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            signer = provider.getSigner();
            const walletAddress = await signer.getAddress();
            walletAddressEl.textContent = "Connected: " + walletAddress;
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            await loadItems();
        } catch (error) {
            console.error("User rejected connection", error);
        }
    }

    async function registerItem() {
        if (!signer) {
            alert("Please connect your wallet first.");
            return;
        }
        const itemName = document.getElementById('itemName').value;
        if (!itemName) {
            alert("Please enter an item name.");
            return;
        }

        try {
            console.log(`Registering item: "${itemName}"...`);
            const tx = await contract.registerItem(itemName);
            alert("Transaction sent! Waiting for confirmation...");
            await tx.wait();
            alert("Item registered successfully!");
            // Listen for the event to refresh UI, or just reload everything
            await loadItems();
        } catch (error) {
            console.error("Error registering item:", error);
            alert("Error registering item. See browser console for details.");
        }
    }

    async function loadItems() {
        itemsContainer.innerHTML = 'Loading items...';
        try {
            const filter = contract.filters.ItemRegistered();
            const events = await contract.queryFilter(filter, 0, 'latest');

            if (events.length === 0) {
                itemsContainer.innerHTML = "No items have been registered yet.";
                return;
            }

            // Get the current user's address if they are connected
            const currentUserAddress = signer ? (await signer.getAddress()).toLowerCase() : '';

            itemsContainer.innerHTML = '';
            for (const event of events.reverse()) {
                const { id, owner, name } = event.args;

                const currentItem = await contract.items(id);
                const currentOwner = currentItem.owner.toLowerCase();

                const itemDiv = document.createElement('div');
                itemDiv.className = 'item';

                let transferUI = '';
                // Only show the transfer UI if the connected user is the current owner
                if (signer && currentOwner === currentUserAddress) {
                    transferUI = `
                    <div style="margin-top: 10px;">
                        <input type="text" id="transfer-addr-${id}" placeholder="Enter new owner address">
                        <button class="transfer-btn" data-id="${id}">Transfer</button>
                    </div>
                `;
                }

                itemDiv.innerHTML = `
                    <p><strong>ID:</strong> ${id.toString()}</p>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Owner:</strong> ${currentItem.owner}</p>
                    ${transferUI}
                    <button class="history-btn" data-id="${id.toString()}" style="margin-top: 5px;">View History</button>
                `;
                itemsContainer.appendChild(itemDiv);
            }

            // Add event listeners to all new transfer buttons
            document.querySelectorAll('.transfer-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const itemId = e.target.getAttribute('data-id');
                    transferItem(itemId); // This now calls your transfer function
                });
            });

            // Add event listeners to all new history buttons
            document.querySelectorAll('.history-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const itemId = e.target.getAttribute('data-id');
                    showHistory(itemId);
                });
            });

        } catch (error) {
            console.error("Error loading items:", error);
            itemsContainer.innerHTML = "Error loading items. See browser console for details.";
        }
    }
    async function transferItem(itemId) {
        if (!signer) {
            alert("Please connect your wallet first.");
            return;
        }
        const newOwnerAddress = document.getElementById(`transfer-addr-${itemId}`).value;
        if (!newOwnerAddress || !ethers.utils.isAddress(newOwnerAddress)) {
            alert("Please enter a valid Ethereum address.");
            return;
        }

        try {
            console.log(`Transferring item ${itemId} to ${newOwnerAddress}...`);
            const tx = await contract.transferOwnership(itemId, newOwnerAddress);
            alert("Transaction sent! Waiting for confirmation...");
            await tx.wait();
            alert("Ownership transferred successfully!");
            // Reload items to reflect the change
            await loadItems();
        } catch (error) {
            console.error("Error transferring ownership:", error);
            alert("Error transferring ownership. See browser console for details.");
        }
    }

    async function showHistory(itemId) {
        alert(`Fetching history for Item ID: ${itemId}...`);
        try {
            // --- THIS IS THE KEY CHANGE ---
            // We ensure itemId is treated as a number for the filter.
            const numericItemId = ethers.BigNumber.from(itemId);

            // Create a filter for the OwnershipTransferred event, specifically for our item ID
            const filter = contract.filters.OwnershipTransferred(numericItemId);
            const events = await contract.queryFilter(filter, 0, 'latest');

            if (events.length === 0) {
                alert(`No transfer history found for Item ID: ${itemId}.`);
                return;
            }

            // Format the history into a readable string
            let historyText = `Ownership History for Item ID: ${itemId}\n\n`;
            // The first owner is the 'to' address of the first transfer event's predecessor.
            // For simplicity, we'll derive it from the first event.
            historyText += `Original Owner: ${events[0].args.from}\n\n`;
            events.forEach((event, index) => {
                const { from, to } = event.args;
                historyText += `Transfer ${index + 1}:\nFrom: ${from}\nTo:   ${to}\n\n`;
            });

            // Display the history in an alert box
            alert(historyText);

        } catch (error) {
            // If it still fails, the console will have the detailed error from the blockchain node.
            console.error("Error fetching history:", error);
            alert("Could not fetch item history. See browser console for details.");
        }
    }

    init();
});