
## Prasyarat

1.  **Node.js dan npm:** Unduh dan install versi LTS dari [nodejs.org](https://nodejs.org/).
2.  **Git (Opsional):** Unduh dari [git-scm.com](https://git-scm.com/).
3.  **Wallet EVM (MetaMask):** Diperlukan untuk mendapatkan alamat testnet dan kunci privat. Buat akun khusus untuk pengembangan/testnet.
4.  **Token Faucet Testnet:** Dapatkan token native (misalnya, Sepolia ETH, LSK Testnet) untuk setiap jaringan testnet yang akan Anda gunakan. Ini diperlukan untuk membayar biaya gas.
5.  **URL RPC Testnet:** Dapatkan URL RPC untuk setiap jaringan testnet dari penyedia seperti Alchemy, Infura, Ankr, atau RPC publik.

## Langkah-Langkah Setup

1.  **Clone Repositori (Jika Ada) atau Buat Proyek Baru:**
    ```bash
    git clone https://github.com/shidiqxyz/super-auto
    cd super-auto
    ```

2.  **Install Dependensi:**
    ```bash
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv fs-extra readline-sync
    npm install @openzeppelin/contracts
    ```

3.  **Inisialisasi Proyek Hardhat (Jika Baru):**
    ```bash
    npx hardhat
    ```
    Pilih: `Create a JavaScript project`, `y` untuk `.gitignore`, `y` untuk install dependensi.

4.  **Siapkan Smart Contract:**
    *   Pastikan file `contracts/MyToken.sol` ada dan berisi kode ERC20 yang disediakan dalam tutorial.
    *   Jika ada `contracts/Lock.sol` (default dari Hardhat), Anda bisa menghapusnya jika tidak diperlukan.

5.  **Konfigurasi Variabel Lingkungan (`.env`):**
    Buat file `.env` di root proyek:
    ```env
    # GANTI DENGAN KUNCI PRIVAT DARI WALLET TESTNET ANDA!
    PRIVATE_KEY=0xyour_testnet_private_key_here

    # RPC URLs (contoh, ganti dengan yang valid)
    BASE_RPC_URL=https://mainnet.base.org # atau testnet: https://goerli.base.org
    OPTIMISM_RPC_URL=https://mainnet.optimism.io # atau testnet: https://goerli.optimism.io
    MODE_RPC_URL=https://mainnet.mode.network # atau testnet
    UNICHAI_RPC_URL=https://unichain-rpc.publicnode.com # (periksa URL yang benar)
    SONEIUM_RPC_URL=https://soneium.drpc.org # (periksa URL yang benar)
    INK_RPC_URL=https://rpc-qnd.inkonchain.com # (periksa URL yang benar)
    LISK_RPC_URL=https://lisk.drpc.org
    ```
    **PENTING:** Tambahkan `.env` ke file `.gitignore` Anda!

6.  **Siapkan Skrip:**
    Pastikan file `scripts/deploy.js`, `scripts/verifyContracts.js`, dan `scripts/distributeTokens.js` ada dan berisi kode yang telah disediakan dalam tutorial (versi yang mendukung multi-network melalui `deploy_config.json`).

7.  **Siapkan Daftar Alamat Penerima (`address.txt`):**
    Buat file `address.txt` di root proyek. Isi dengan daftar alamat wallet (satu alamat per baris) yang akan menerima token.
    ```
    0xAlamatWalletTestnetPenerima1................
    0xAlamatWalletTestnetPenerima2................
    ```

## Cara Menggunakan

1.  **Kompilasi Smart Contract:**
    ```bash
    npx hardhat compile
    ```

2.  **Deploy Token ke Banyak Jaringan:**
    Skrip ini akan membaca `deploy_config.json` untuk daftar jaringan target.
    ```bash
    npx hardhat run scripts/deploy.js
    ```
    Anda akan diminta memasukkan nama dan simbol token. Informasi deployment akan disimpan di `deployed_tokens.json`.

3.  **Verifikasi Kontrak (Opsional):**
    Skrip ini membaca `deployed_tokens.json` dan memverifikasi data token on-chain.
    ```bash
    npx hardhat run scripts/verifyContracts.js
    ```

4.  **Distribusi Token ke Banyak Jaringan:**
    Skrip ini akan membaca `deploy_config.json` untuk daftar jaringan target dan `address.txt` untuk daftar penerima.
    ```bash
    npx hardhat run scripts/distributeTokens.js
    ```
    Anda akan diminta memasukkan simbol token yang akan didistribusikan (yang harus sudah dideploy dan tercatat di `deployed_tokens.json`). Hasil transfer akan dicatat di `transfers.log`.

## Catatan Penting

*   **Testnet:** Selalu uji semua fungsionalitas di jaringan testnet terlebih dahulu sebelum menggunakan aset nyata di mainnet.
*   **Kunci Privat:** JANGAN PERNAH membagikan kunci privat Anda atau meng-commit file `.env` ke repositori publik.
*   **Biaya Gas:** Pastikan akun deployer (yang kunci privatnya ada di `.env`) memiliki cukup token native di setiap jaringan target untuk membayar biaya transaksi (gas).
*   **Konfigurasi:** Pastikan semua nama jaringan, URL RPC, dan Chain ID dikonfigurasi dengan benar di `hardhat.config.js` dan `deploy_config.json`.
*   **Verifikasi Explorer:** Untuk verifikasi kontrak otomatis di block explorer, Anda mungkin memerlukan API key dari explorer tersebut dan mengkonfigurasinya di bagian `etherscan` pada `hardhat.config.js`.

## Troubleshooting

*   **Error Saldo Tidak Cukup:** Periksa saldo native token dan token ERC20 (jika mendistribusikan) di akun deployer pada jaringan yang relevan. Gunakan faucet testnet jika perlu.
*   **Error Konfigurasi Jaringan:** Pastikan nama jaringan di `deploy_config.json` cocok persis dengan yang ada di `hardhat.config.js` dan memiliki URL RPC yang valid.
*   **Verifikasi Gagal:** Cek `constructorArguments` di skrip, API key explorer, dan pastikan explorer sudah mengindeks transaksi deployment.
*   **Log Detail:** Gunakan flag `--verbose` dengan perintah Hardhat untuk output yang lebih detail saat debugging (misalnya, `npx hardhat run scripts/deploy.js --verbose`).
