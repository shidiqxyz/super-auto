require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const {
  PRIVATE_KEY,
  LISK_RPC_URL, BASE_RPC_URL, OPTIMISM_RPC_URL, MODE_RPC_URL,
  UNICHAI_RPC_URL, SONEIUM_RPC_URL, INK_RPC_URL
} = process.env;

// Pastikan semua variabel lingkungan ada
if (!PRIVATE_KEY) {
  throw new Error("Harap set PRIVATE_KEY di file .env Anda");
}
// Tambahkan pengecekan serupa untuk semua RPC_URL yang akan digunakan

module.exports = {
  solidity: "0.8.20", // Sesuaikan dengan versi OpenZeppelin
  networks: {
    // Contoh konfigurasi, lengkapi untuk semua chain target
    base: {
      url: BASE_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      // chainId: 8453 // Mainnet Base
    },
    optimism: {
      url: OPTIMISM_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      // chainId: 10 // Mainnet Optimism
    },
    mode: {
      url: MODE_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      // chainId: (cari tahu Chain ID Mode)
    },
    unichain: {
      url: UNICHAI_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      // chainId: (cari tahu Chain ID Unichain)
    },
    soneium: {
      url: SONEIUM_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      // chainId: (cari tahu Chain ID Soneium)
    },
    ink: {
      url: INK_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      // chainId: (cari tahu Chain ID Ink)
    },
    lisk: {
      url: LISK_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      // chainId: (cari tahu Chain ID Ink)
    },
    // Tambahkan jaringan lokal untuk testing jika perlu
    hardhat: {}, // Jaringan lokal Hardhat
  }
};