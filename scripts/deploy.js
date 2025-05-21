// scripts/deploy.js
// MENDEPLOY KE BANYAK JARINGAN YANG DITENTUKAN DALAM FILE 'deploy_config.json'
// Jalankan dengan: npx hardhat run scripts/deploy.js

const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs-extra");
const path = require("path");
const readlineSync = require('readline-sync');

const deployedTokensFile = path.join(__dirname, "..", "deployed_tokens.json");
const deployConfigFile = path.join(__dirname, "..", "deploy_config.json"); // Path ke file konfigurasi

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
    const tokenName = readlineSync.question("Masukkan nama token: ");
    const tokenSymbol = readlineSync.question("Masukkan ticker/simbol token: ");
    const totalSupply = 1_000_000_000;

    if (!tokenName || !tokenSymbol) {
        console.error("Nama dan simbol token tidak boleh kosong!");
        process.exit(1);
    }

    const targetNetworks = await getTargetNetworksFromConfig(); // Baca dari file config

    if (targetNetworks.length === 0) {
        console.error(`Tidak ada jaringan target yang ditentukan dalam ${deployConfigFile} atau file tidak valid.`);
        console.error(`Pastikan ${deployConfigFile} ada dan berisi: { "targetNetworks": ["net1", "net2"] }`);
        process.exit(1);
    }

    // ... (Sisa kode dari fungsi main() sama persis dengan Opsi A di atas) ...
    // Salin seluruh sisa fungsi main() dari Opsi A ke sini, mulai dari:
    // console.log(`\nAkan mencoba deploy ${tokenName} (${tokenSymbol}) ke jaringan: ${targetNetworks.join(', ')}`);
    // hingga akhir fungsi main().

    console.log(`\nAkan mencoba deploy ${tokenName} (${tokenSymbol}) ke jaringan: ${targetNetworks.join(', ')}`);
    console.log(`Total supply: ${totalSupply} (sebelum desimal)`);

    let deployedData = {};
    try {
        if (await fs.pathExists(deployedTokensFile)) {
            deployedData = await fs.readJson(deployedTokensFile);
        }
    } catch (error) {
        console.warn("Tidak dapat membaca file deployed_tokens.json yang ada, akan membuat baru.");
        deployedData = {};
    }
    
    const MyTokenFactory = await ethers.getContractFactory("MyToken");
    const deployerPrivateKey = process.env.PRIVATE_KEY;

    if (!deployerPrivateKey) {
        console.error("PRIVATE_KEY tidak ditemukan di file .env. Dibutuhkan untuk membuat signer manual per jaringan.");
        process.exit(1);
    }

    for (const networkName of targetNetworks) {
        console.log(`\n--- Memproses Jaringan: ${networkName} ---`);

        const networkConfig = hre.config.networks[networkName];
        if (!networkConfig || !networkConfig.url) {
            console.warn(`Konfigurasi untuk jaringan ${networkName} tidak ditemukan atau URL RPC kosong di hardhat.config.js. Dilewati.`);
            if (!deployedData[networkName]) deployedData[networkName] = {};
            deployedData[networkName][tokenSymbol] = {
                name: tokenName,
                error: `Konfigurasi jaringan ${networkName} tidak ditemukan atau URL RPC kosong.`,
                deployedAt: new Date().toISOString()
            };
            continue;
        }

        try {
            const provider = new ethers.JsonRpcProvider(networkConfig.url);
            const signer = new ethers.Wallet(deployerPrivateKey, provider);
            console.log(`Menggunakan akun deployer: ${signer.address} di jaringan ${networkName}`);

            const balanceWei = await provider.getBalance(signer.address);
            console.log(`Saldo akun (native token): ${ethers.formatEther(balanceWei)}`);

            if (balanceWei === 0n) {
                console.error(`Saldo native token akun di ${networkName} adalah 0. Tidak bisa deploy. Harap isi saldo.`);
                if (!deployedData[networkName]) deployedData[networkName] = {};
                deployedData[networkName][tokenSymbol] = {
                    name: tokenName,
                    error: `Saldo native token akun deployer di ${networkName} adalah 0.`,
                    deployedAt: new Date().toISOString()
                };
                continue;
            }

            const connectedFactory = MyTokenFactory.connect(signer);
            console.log(`Mendeploy ${tokenName} (${tokenSymbol}) ke ${networkName}...`);
            const token = await connectedFactory.deploy(tokenName, tokenSymbol, totalSupply);
            
            console.log(`Menunggu deployment ${tokenName} di ${networkName}... Tx hash: ${token.deploymentTransaction().hash}`);
            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();

            console.log(`${tokenName} (${tokenSymbol}) berhasil dideploy ke ${networkName} di alamat: ${tokenAddress}`);

            if (!deployedData[networkName]) deployedData[networkName] = {};
            deployedData[networkName][tokenSymbol] = {
                name: tokenName,
                address: tokenAddress,
                totalSupply: totalSupply.toString() + " (plus decimals)",
                decimals: 18,
                deployedAt: new Date().toISOString(),
                deployer: signer.address,
                txHash: token.deploymentTransaction().hash
            };

            // Verifikasi kontrak (opsional)
            let canVerify = false;
            if (hre.config.etherscan && hre.config.etherscan.apiKey) {
                if (typeof hre.config.etherscan.apiKey === 'string' && hre.config.etherscan.apiKey.trim() !== '') canVerify = true;
                else if (typeof hre.config.etherscan.apiKey === 'object' && hre.config.etherscan.apiKey[networkName]) canVerify = true;
                else if (hre.config.etherscan.customChains && hre.config.etherscan.customChains.find(c => c.network === networkName)) canVerify = true;
            }
            
            if (canVerify) {
                console.log("Menunggu beberapa blok sebelum verifikasi (sekitar 60 detik)...");
                await new Promise(resolve => setTimeout(resolve, 60000));
                try {
                    console.log(`Mencoba verifikasi kontrak ${tokenAddress} di jaringan ${networkName}...`);
                    await hre.run("verify:verify", {
                        address: tokenAddress,
                        constructorArguments: [tokenName, tokenSymbol, totalSupply],
                        network: networkName, 
                    });
                    console.log(`Kontrak terverifikasi di explorer jaringan ${networkName}.`);
                    deployedData[networkName][tokenSymbol].verified = true;
                } catch (verifyError) {
                    console.error(`Gagal verifikasi di ${networkName}:`, verifyError.message);
                    deployedData[networkName][tokenSymbol].verified = false;
                    deployedData[networkName][tokenSymbol].verificationError = verifyError.message;
                }
            } else {
                console.log(`Konfigurasi API Key Etherscan/Explorer tidak ditemukan atau tidak lengkap untuk jaringan ${networkName}. Verifikasi dilewati.`);
                deployedData[networkName][tokenSymbol].verified = "skipped_no_config";
            }

        } catch (error) {
            console.error(`Gagal deploy ke ${networkName}:`, error);
            if (!deployedData[networkName]) deployedData[networkName] = {};
            deployedData[networkName][tokenSymbol] = {
                name: tokenName,
                error: error.message || JSON.stringify(error),
                deployedAt: new Date().toISOString()
            };
        }
    }

    await fs.writeJson(deployedTokensFile, deployedData, { spaces: 2 });
    console.log(`\nProses deployment untuk semua jaringan yang ditentukan selesai. Data disimpan di ${deployedTokensFile}`);
}

main().catch((error) => {
    console.error("Error fatal dalam skrip deploy:", error);
    process.exitCode = 1;
});