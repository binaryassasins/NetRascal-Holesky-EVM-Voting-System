export {};

declare global {
  interface Window {
    ethereum?: any; // Add the Ethereum provider type if known (e.g., MetaMask's type)
  }
}
