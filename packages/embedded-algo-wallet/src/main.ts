import algosdk from "algosdk";
import CryptoJS from "crypto-js";
import configs from "./config.json";
import { clear, get, set } from "./dbWallet";

export interface AlgoAccount {
  addr: string;
  sk: string;
  salt: string;
}

export interface Config {
  algod: {
    url: string;
    port?: number;
    token?: string;
  };
}

export default class Wallet {
  acct: AlgoAccount;
  acctInfo: algosdk.modelsv2.Account;
  algod: algosdk.Algodv2;
  private token: string;

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

  async getAcctInfo() {
    this.acctInfo = await this.algod.accountInformation(this.acct.addr).do();
  }

  async startup() {
    this.acct = await get("keyval", "acct");
    if (this.acct) await this.getAcctInfo();
  }

  async createAcct(password: string, mnemonic?: string) {
    if (this.acct) {
      if (
        !confirm(`WARNING!
Account already exists. Overwrite?`)
      )
        return;
    }
    const acct = mnemonic
      ? algosdk.mnemonicToSecretKey(mnemonic)
      : algosdk.generateAccount();
    const saltArray = crypto.getRandomValues(new Uint8Array(12));
    const salt = Buffer.from(saltArray).toString("base64");
    this.token = await hashPassword(password + salt);
    const sk = CryptoJS.AES.encrypt(
      Buffer.from(acct.sk).toString("base64"),
      this.token
    ).toString();
    this.acct = { addr: acct.addr.toString(), sk, salt };
    await set("keyval", "acct", JSON.parse(JSON.stringify(this.acct)));
    await this.getAcctInfo();
  }

  async unlock(password: string) {
    const token = await hashPassword(password + this.acct.salt);
    const decKey = CryptoJS.AES.decrypt(this.acct.sk, token);
    if (decKey.sigBytes !== 88) {
      throw Error("Incorrect Password");
    }
    this.token = token;
  }

  async decryptKey() {
    const decKey = CryptoJS.AES.decrypt(this.acct.sk, this.token);
    if (decKey.sigBytes !== 88) {
      this.token = undefined;
      throw Error("Incorrect Token");
    }
    const key = Buffer.from(decKey.toString(CryptoJS.enc.Utf8), "base64");
    return key;
  }

  async exportAcct(password: string) {
    if (!this.acct) {
      throw Error("No Account Exists");
    }
    await this.unlock(password);
    const key = await this.decryptKey();
    const mnemonic = algosdk.mnemonicFromSeed(key.subarray(0, 32));
    return mnemonic;
  }

  async txnSigner(txnGroup: algosdk.Transaction[], indexesToSign: number[]) {
    const key = await this.decryptKey();
    const signedTxns = txnGroup.map((txn, idx) =>
      indexesToSign.includes(idx) ? algosdk.signTransaction(txn, key) : null
    );
    return signedTxns.map((stxn) => stxn.blob);
  }

  clearAcct() {
    clear("keyval");
    this.acctInfo = undefined;
    this.acct = undefined;
    this.token = undefined;
  }
}

async function hashPassword(password: string) {
  const token = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))
  ).toString("base64");
  return token;
}
