// scripts/distributeTokens.js
// MENDEISTRIBUSIKAN TOKEN KE BANYAK JARINGAN YANG DITENTUKAN DALAM FILE 'deploy_config.json'
// Jalankan dengan: npx hardhat run scripts/distributeTokens.js

const hre = require("hardhat");
const ethers = hre.ethers; // Menggunakan ethers dari HRE
const fs = require("fs-extra");
const path = require("path");
const readlineSync = require('readline-sync');

const deployedTokensFile = path.join(__dirname, "..", "deployed_tokens.json");
const addressesFile = path.join(__dirname, "..", "address.txt");
const transfersLogFile = path.join(__dirname, "..", "transfers.log");
const deployConfigFile = path.join(__dirname, "..", "deploy_config.json"); // Path ke file konfigurasi

const erc20AbiMinimal = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)"
];

function getRandomAmount(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function logTransfer(message) {
    console.log(message);
    await fs.appendFile(transfersLogFile, `${new Date().toISOString()} - ${message}\n`);
}

async function getTargetNetworksFromConfig() {
    try {
        if (await fs.pathExists(deployConfigFile)) {
            const config = await fs.readJson(deployConfigFile);
            if (config && Array.isArray(config.targetNetworks)) {
                return config.targetNetworks.map(n => n.trim()).filter(n => n);
            }
        }
    } catch (error) {
        console.error(`Gagal membaca atau mem-parsing ${deployConfigFile}:`, error);
    }
    return [];
}

async function main() {
    if (!await fs.pathExists(deployedTokensFile)) {
        await logTransfer(`ERROR: File ${deployedTokensFile} tidak ditemukan. Jalankan script deploy terlebih dahulu.`);
        process.exit(1);
    }
    if (!await fs.pathExists(addressesFile)) {
        await logTransfer(`ERROR: File ${addressesFile} tidak ditemukan. Harap buat dan isi dengan alamat target.`);
        process.exit(1);
    }

    const deployedData = await fs.readJson(deployedTokensFile);
    const walletAddressesRaw = await fs.readFile(addressesFile, "utf-8");
    const allWalletAddresses = walletAddressesRaw.split(/\r?\n/).map(addr => addr.trim()).filter(addr => ethers.isAddress(addr));

    if (allWalletAddresses.length === 0) {
        await logTransfer("ERROR: Tidak ada alamat valid ditemukan di address.txt.");
        process.exit(1);
    }
    
    let targetWallets = [...allWalletAddresses];
    if (targetWallets.length > 250) {
        for (let i = targetWallets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [targetWallets[i], targetWallets[j]] = [targetWallets[j], targetWallets[i]];
        }
        targetWallets = targetWallets.slice(0, 250);
    }
    
    console.log(`Akan mengirim token ke ${targetWallets.length} wallet.`);
    await logTransfer(`INFO: Memulai distribusi token ke ${targetWallets.length} wallet.`);

    const tokenSymbolToDistribute = readlineSync.question("Masukkan simbol token yang akan didistribusikan (dari deployed_tokens.json): ");
    if (!tokenSymbolToDistribute) {
        await logTransfer("ERROR: Simbol token tidak boleh kosong.");
        process.exit(1);
    }

    const targetNetworks = await getTargetNetworksFromConfig();

    if (targetNetworks.length === 0) {
        await logTransfer(`ERROR: Tidak ada jaringan target yang ditentukan dalam ${deployConfigFile} atau file tidak valid.`);
        console.error(`Pastikan ${deployConfigFile} ada dan berisi: { "targetNetworks": ["net1", "net2"] }`);
        process.exit(1);
    }

    const deployerPrivateKey = process.env.PRIVATE_KEY;
    if (!deployerPrivateKey) {
        await logTransfer("ERROR: PRIVATE_KEY tidak ditemukan di file .env. Dibutuhkan untuk membuat signer manual per jaringan.");
        process.exit(1);
    }

    await logTransfer(`INFO: Akan mencoba distribusi token ${tokenSymbolToDistribute} ke jaringan: ${targetNetworks.join(', ')}`);

    for (const currentNetworkName of targetNetworks) {
        console.log(`\n--- Memproses Distribusi untuk Jaringan: ${currentNetworkName} ---`);
        await logTransfer(`INFO: --- Memulai distribusi untuk jaringan ${currentNetworkName} ---`);

        const networkConfig = hre.config.networks[currentNetworkName];
        if (!networkConfig || !networkConfig.url) {
            await logTransfer(`WARNING: [${currentNetworkName}] Konfigurasi tidak ditemukan atau URL RPC kosong di hardhat.config.js. Dilewati.`);
            continue;
        }

        if (!deployedData[currentNetworkName]) {
            await logTransfer(`WARNING: [${currentNetworkName}] Tidak ada data deployment di ${deployedTokensFile}. Dilewati.`);
            continue;
        }

        if (!deployedData[currentNetworkName][tokenSymbolToDistribute]) {
            await logTransfer(`WARNING: [${currentNetworkName}] Token ${tokenSymbolToDistribute} tidak ditemukan di ${deployedTokensFile}. Dilewati.`);
            continue;
        }

        const tokenInfo = deployedData[currentNetworkName][tokenSymbolToDistribute];
        if (tokenInfo.error || !tokenInfo.address) {
            await logTransfer(`ERROR: [${currentNetworkName}] Token ${tokenSymbolToDistribute} memiliki error deployment atau alamat tidak ada. Pesan: ${tokenInfo.error || 'N/A'}. Dilewati.`);
            continue;
        }

        await logTransfer(`INFO: [${currentNetworkName}] Memproses distribusi untuk token ${tokenInfo.name} (${tokenSymbolToDistribute}) di alamat ${tokenInfo.address}`);

        try {
            const provider = new ethers.JsonRpcProvider(networkConfig.url);
            const signer = new ethers.Wallet(deployerPrivateKey, provider);
            
            const balanceNative = await provider.getBalance(signer.address);
            console.log(`  [${currentNetworkName}] Saldo native token deployer (${signer.address}): ${ethers.formatEther(balanceNative)}`);
            if (balanceNative === 0n) {
                await logTransfer(`WARNING: [${currentNetworkName}] Saldo native token deployer adalah 0. Transaksi mungkin gagal karena gas.`);
            }

            const tokenContract = new ethers.Contract(tokenInfo.address, erc20AbiMinimal, signer);
            const decimals = await tokenContract.decimals();

            const deployerTokenBalance = await tokenContract.balanceOf(signer.address);
            await logTransfer(`INFO: [${currentNetworkName}] Saldo token ${tokenSymbolToDistribute} milik deployer (${signer.address}): ${ethers.formatUnits(deployerTokenBalance, decimals)}`);

            if (deployerTokenBalance === 0n) {
                await logTransfer(`WARNING: [${currentNetworkName}] Saldo token ${tokenSymbolToDistribute} milik deployer adalah 0. Tidak bisa mengirim token dari jaringan ini.`);
                continue; // Lanjut ke jaringan berikutnya
            }

            for (const [index, walletAddress] of targetWallets.entries()) {
                const amountTokens = getRandomAmount(100, 10000);
                const amountWithDecimals = BigInt(amountTokens) * (10n ** BigInt(decimals));

                await logTransfer(`INFO: [${currentNetworkName}] Mencoba mengirim ${amountTokens} ${tokenSymbolToDistribute} ke ${walletAddress} (${index + 1}/${targetWallets.length})`);
                
                try {
                    const currentDeployerTokenBalance = await tokenContract.balanceOf(signer.address);
                    if (currentDeployerTokenBalance < amountWithDecimals) {
                        await logTransfer(`ERROR: [${currentNetworkName}] Saldo token deployer tidak cukup untuk mengirim ${amountTokens} ${tokenSymbolToDistribute} ke ${walletAddress}. Saldo: ${ethers.formatUnits(currentDeployerTokenBalance, decimals)}. Menghentikan distribusi untuk jaringan ini.`);
                        break; // Hentikan untuk jaringan ini, lanjut ke jaringan berikutnya jika ada
                    }

                    const tx = await tokenContract.transfer(walletAddress, amountWithDecimals, {
                        // gasPrice: ethers.parseUnits('5', 'gwei'), // Contoh override gas price
                    });
                    console.log(`  [${currentNetworkName}] Mengirim ${amountTokens} ${tokenSymbolToDistribute} ke ${walletAddress}. Tx hash: ${tx.hash}. Menunggu konfirmasi...`);
                    // const receipt = await tx.wait(1);
                    
                    // if (receipt.status === 1) {
                    //     await logTransfer(`SUCCESS: [${currentNetworkName}] Berhasil mengirim ${amountTokens} ${tokenSymbolToDistribute} ke ${walletAddress}. Tx hash: ${tx.hash}`);
                    // } else {
                    //     await logTransfer(`FAILED_TX: [${currentNetworkName}] Transaksi gagal mengirim ${amountTokens} ${tokenSymbolToDistribute} ke ${walletAddress}. Tx hash: ${tx.hash}. Status: ${receipt.status}`);
                    // }
                    
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Jeda 2 detik antar transfer

                } catch (transferError) {
                    await logTransfer(`ERROR_TRANSFER: [${currentNetworkName}] Gagal mengirim token ke ${walletAddress}: ${transferError.message}`);
                    if (transferError.transactionHash) {
                         await logTransfer(`   Tx Hash (jika ada): ${transferError.transactionHash}`);
                    }
                    // Pertimbangkan untuk menambahkan jeda lebih lama atau mekanisme retry di sini
                }
            } // Akhir loop wallet
        } catch (networkInteractionError) {
            await logTransfer(`ERROR_NETWORK_INTERACTION: [${currentNetworkName}] Gagal setup atau interaksi awal: ${networkInteractionError.message}`);
            console.error(`ERROR_NETWORK_INTERACTION: [${currentNetworkName}]`, networkInteractionError);
        }
        await logTransfer(`INFO: --- Selesai distribusi untuk jaringan ${currentNetworkName} ---`);
    } // Akhir loop jaringan
    
    await logTransfer("INFO: Proses distribusi untuk semua jaringan yang ditentukan selesai.");
    console.log("\nProses distribusi untuk semua jaringan yang ditentukan selesai.");
}

main().catch(async (error) => {
    await logTransfer(`FATAL_ERROR_SCRIPT: ${error.stack}`);
    console.error(error);
    process.exitCode = 1;
});