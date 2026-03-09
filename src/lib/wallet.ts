import WalletManagerEvmErc4337 from '@tetherto/wdk-wallet-evm-erc-4337';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Ethereum Sepolia testnet config — swap for mainnet in production
const walletConfig = {
    chainId: 11155111,
    provider: 'https://sepolia.drpc.org',
    bundlerUrl: 'https://public.pimlico.io/v2/11155111/rpc',
    paymasterUrl: 'https://public.pimlico.io/v2/11155111/rpc',
    paymasterAddress: '0x777777777777AeC03fd955926DbF81597e66834C',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0' as const,
    paymasterToken: {
        address: process.env.NEXT_PUBLIC_USDT_ADDRESS || '0xd077a400968890eacc75cdc901f0356c943e4fdb',
    },
    transferMaxFee: 100000,
};

function getEncryptionKey(): Buffer {
    const secret = process.env.WALLET_ENCRYPTION_KEY;
    if (!secret) throw new Error('WALLET_ENCRYPTION_KEY env var is not set');
    return scryptSync(secret, 'zivy-wallet-salt', 32);
}

export function encryptSeedPhrase(seedPhrase: string): string {
    const key = getEncryptionKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(seedPhrase, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decryptSeedPhrase(encryptedData: string): string {
    const key = getEncryptionKey();
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export async function createSmartWallet(): Promise<{
    walletAddress: string;
    encryptedSeedPhrase: string;
}> {
    const seedPhrase = WalletManagerEvmErc4337.getRandomSeedPhrase();
    const wallet = new WalletManagerEvmErc4337(seedPhrase, walletConfig);

    try {
        const account = await wallet.getAccount(0);
        const walletAddress = await account.getAddress();
        const encryptedSeedPhrase = encryptSeedPhrase(seedPhrase);

        return { walletAddress, encryptedSeedPhrase };
    } finally {
        wallet.dispose();
    }
}
