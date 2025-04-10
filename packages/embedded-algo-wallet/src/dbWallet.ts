import { DBSchema, StoreKey, StoreNames, openDB } from "idb";

export interface Acct {
  addr: string;
  keyData: ArrayBuffer;
  salt: Uint8Array;
  iv: Uint8Array;
}

interface WalletDB extends DBSchema {
  keyval: {
    key: "acct";
    value: Acct;
  };
}

const dbWallet = openDB<WalletDB>("wallet", 1, {
  async upgrade(db) {
    db.createObjectStore("keyval");
  },
});

export async function get(
  storeName: StoreNames<WalletDB>,
  key: StoreKey<WalletDB, StoreNames<WalletDB>>
) {
  return (await dbWallet).get(storeName, key);
}

export async function getAll(storeName: StoreNames<WalletDB>) {
  return (await dbWallet).getAll(storeName);
}

export async function set(
  storeName: StoreNames<WalletDB>,
  key: StoreKey<WalletDB, StoreNames<WalletDB>> | undefined,
  val: Acct
) {
  return (await dbWallet).put(storeName, val, key);
}

export async function del(
  storeName: StoreNames<WalletDB>,
  key: StoreKey<WalletDB, StoreNames<WalletDB>>
) {
  return (await dbWallet).delete(storeName, key);
}

export async function clear(storeName: StoreNames<WalletDB>) {
  return (await dbWallet).clear(storeName);
}

export async function keys(storeName: StoreNames<WalletDB>) {
  return (await dbWallet).getAllKeys(storeName);
}

export default dbWallet;
