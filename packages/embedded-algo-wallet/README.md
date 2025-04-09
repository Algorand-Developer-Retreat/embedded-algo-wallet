# embedded-algo-wallet

A minimal TS package to embed a hot wallet into a dApp

**WARNING: You should not be storing private keys for wallets that hold large monetary values. Browser storage is inherently less secure than other methods. This library is intended mainly for burner/hot wallets.**

## Overview

This library is inteded to help with storing private keys in web applications that use the Algorand blockchain but prefer to simplify the signing process to button presses instead of the usual wallet signing method.

This approach should be used only with accounts generated for the sole purpose of usage inside your application.

## Initialize

```ts
const wallet = new Wallet("testnet"); // "localnet" | "testnet" | "mainnet" | "voimain"

await wallet.startup(); // Required after instantiation
```

## Create Account

```ts
await wallet.createAcct(password); // New account

await wallet.createAcct(password, mnemonic); // Import an existing account
```

## Lock/Unlock Wallet

```ts
wallet.lock(); // Lock

await wallet.unlock(password); // Unlock

console.log("Locked Status:", wallet.isLocked()); // true/false
```

## Wallet Details

```ts
wallet.refresh(); // Refresh Account Info

console.log("Address:", wallet.acct.addr);
console.log("Balance:", Number(wallet.acctInfo.amount) / 10 ** 6);
```

## Export Mnemonic

```ts
console.log(await wallet.exportAcct(password));
```

## Example Transaction using `signer`

```ts
const algorand = AlgorandClient.fromClients({
  algod: wallet.algod as algosdk.Algodv2,
});

const result = await algorand.send.payment({
  sender: wallet.acct.addr,
  receiver: wallet.acct.addr,
  amount: microAlgos(0),
  signer: wallet.signer,
});

console.log("Confirmed in round " + result.confirmation.confirmedRound);
await wallet.refresh();
```

## Clear Account

**Use with caution or not at all! All key data is cleared from storage.**

```ts
wallet.clearAcct();
```
