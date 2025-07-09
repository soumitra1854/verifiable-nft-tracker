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

// Main function that runs after the page is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // --- Element Selectors ---
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const registerBtn = document.getElementById('registerBtn');
    const itemsContainer = document.getElementById('itemsContainer');
    const walletAddressEl = document.getElementById('walletAddress');
    const modal = document.getElementById('historyModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // --- Event Listeners ---
    connectWalletBtn.addEventListener('click', connectWallet);
    registerBtn.addEventListener('click', registerItem);
    
    // Listeners to close the history modal
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // --- Core Functions ---

    // Initial setup when the page loads
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

    // Connects to the user's MetaMask wallet
    async function connectWallet() {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            signer = provider.getSigner();
            const walletAddress = await signer.getAddress();
            walletAddressEl.textContent = walletAddress;
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            await loadItems(); // Reload items to show user-specific UI
        } catch (error) {
            console.error("User rejected connection", error);
        }
    }

    // Registers a new item by sending a transaction
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
            const tx = await contract.registerItem(itemName);
            alert("Transaction sent! Waiting for confirmation...");
            await tx.wait();
            alert("Item registered successfully!");
            await loadItems();
        } catch (error) {
            console.error("Error registering item:", error);
            alert("Error registering item. See browser console for details.");
        }
    }

    // Transfers an item's ownership by sending a transaction
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
            const tx = await contract.transferOwnership(itemId, newOwnerAddress);
            alert("Transaction sent! Waiting for confirmation...");
            await tx.wait();
            alert("Ownership transferred successfully!");
            await loadItems();
        } catch (error) {
            console.error("Error transferring ownership:", error);
            alert("Error transferring ownership. See browser console for details.");
        }
    }

    // Fetches and displays the provenance history in the modal
    async function showHistory(itemId) {
        const historyContent = document.getElementById('historyContent');
        historyContent.innerHTML = 'Fetching history...';
        modal.style.display = 'flex'; // Show the modal

        try {
            const numericItemId = ethers.BigNumber.from(itemId); 
            const filter = contract.filters.OwnershipTransferred(numericItemId);
            const events = await contract.queryFilter(filter, 0, 'latest');

            if (events.length === 0) {
                historyContent.innerText = `No transfer history found for Item ID: ${itemId}.`;
                return;
            }

            let historyText = '';
            const originalOwner = events[0].args.from;
            historyText += `Original Owner:\n${originalOwner}\n\n`;
            historyText += `Transaction History:\n`;

            events.forEach((event, index) => {
                const { from, to } = event.args;
                historyText += `\n${index + 1}. From: ${from}\n   To:   ${to}`;
            });

            historyContent.innerText = historyText;

        } catch (error) {
            console.error("Error fetching history:", error);
            historyContent.innerText = "Could not fetch item history.";
        }
    }

    // Fetches all items and renders them on the page
    async function loadItems() {
        itemsContainer.innerHTML = 'Loading items...';
        try {
            const filter = contract.filters.ItemRegistered();
            const events = await contract.queryFilter(filter, 0, 'latest');

            if (events.length === 0) {
                itemsContainer.innerHTML = "No items have been registered yet.";
                return;
            }

            const currentUserAddress = signer ? (await signer.getAddress()).toLowerCase() : '';
            itemsContainer.innerHTML = ''; // Clear the container

            for (const event of events.reverse()) { // Show newest first
                const { id, name } = event.args;
                const currentItem = await contract.items(id);
                const currentOwner = currentItem.owner.toLowerCase();

                const itemDiv = document.createElement('div');
                itemDiv.className = 'item';
                
                let transferUI = '';
                if (signer && currentOwner === currentUserAddress) {
                    transferUI = `
                        <div class="form-group" style="margin-top: 1rem;">
                            <input type="text" id="transfer-addr-${id}" placeholder="Enter new owner address">
                            <button class="transfer-btn" data-id="${id}">Transfer</button>
                        </div>
                    `;
                }

                itemDiv.innerHTML = `
                    <p><strong>ID:</strong> <span>${id.toString()}</span></p>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Owner:</strong> <span>${currentItem.owner}</span></p>
                    <div class="item-footer">
                        <button class="history-btn" data-id="${id.toString()}">View History</button>
                    </div>
                    ${transferUI}
                `;
                itemsContainer.appendChild(itemDiv);
            }

            // Attach listeners to all newly created buttons
            document.querySelectorAll('.transfer-btn').forEach(button => {
                button.addEventListener('click', e => transferItem(e.target.dataset.id));
            });
            document.querySelectorAll('.history-btn').forEach(button => {
                button.addEventListener('click', e => showHistory(e.target.dataset.id));
            });

        } catch (error) {
            console.error("Error loading items:", error);
            itemsContainer.innerHTML = "Error loading items. See browser console for details.";
        }
    }

    // --- Run Initialization ---
    init();
});