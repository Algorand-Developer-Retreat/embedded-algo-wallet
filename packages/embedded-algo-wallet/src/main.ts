import algosdk from "algosdk";
import configs from "./config.json";
import { Acct, clear, get, set } from "./dbWallet";

export interface Config {
  algod: {
    url: string;
    port?: number;
    token?: string;
  };
}

export default class Wallet {
  acct: Acct;
  acctInfo: algosdk.modelsv2.Account;
  algod: algosdk.Algodv2;
  private token: CryptoKey;

  constructor(env: "localnet" | "testnet" | "mainnet" | "voimain" = "mainnet") {
    const config: Config = configs[env];
    this.algod = new algosdk.Algodv2(
      config.algod?.token || "",
      config.algod.url,
      config.algod?.port
    );
  }

  isLocked() {
    return !this.token;
  }

  async startup() {
    this.acct = await get("keyval", "acct");
    if (this.acct) await this.refresh();
  }

  async refresh() {
    this.acctInfo = await this.algod.accountInformation(this.acct.addr).do();
  }

  async createAcct(pass: string, mnemonic?: string) {
    if (this.acct) {
      if (
        !confirm(`WARNING!
Account already exists. Overwrite?`)
      )
        return;
    }
    const account = mnemonic
      ? algosdk.mnemonicToSecretKey(mnemonic)
      : algosdk.generateAccount();

    const salt = crypto.getRandomValues(new Uint8Array(12));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    this.token = await deriveTokenFromPassSalt(pass, salt);
    const keyData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.token,
      account.sk
    );
    const acct = { addr: account.addr.toString(), keyData, salt, iv };
    this.acct = acct;
    await set("keyval", "acct", acct);
    await this.refresh();
  }

  async unlock(pass: string) {
    this.token = await deriveTokenFromPassSalt(pass, this.acct.salt);
    await this.decryptKey();
  }

  lock() {
    this.token = undefined;
  }

  async exportAcct(pass: string) {
    if (!this.acct) {
      throw Error("No Account Exists");
    }
    await this.unlock(pass);
    const key = await this.decryptKey();
    const mnemonic = algosdk.mnemonicFromSeed(key.subarray(0, 32));
    return mnemonic;
  }

  signer = async (txnGroup: algosdk.Transaction[], indexesToSign: number[]) => {
    const key = await this.decryptKey();
    const signedTxns = txnGroup.map((txn, idx) =>
      indexesToSign.includes(idx) ? algosdk.signTransaction(txn, key) : null
    );
    return signedTxns.map((stxn) => stxn.blob);
  };

  clearAcct() {
    clear("keyval");
    this.acctInfo = undefined;
    this.acct = undefined;
    this.token = undefined;
  }

  private async decryptKey() {
    try {
      return Buffer.from(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: this.acct.iv },
          this.token,
          this.acct.keyData
        )
      );
    } catch {
      this.token = undefined;
      throw Error("Incorrect Password");
    }
  }
}

async function deriveTokenFromPassSalt(pass: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}
