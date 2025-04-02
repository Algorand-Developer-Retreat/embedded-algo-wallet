# Embedded Algorand Wallet

## Initialize

```ts
const wallet = new Wallet("testnet");
await wallet.startup();
```

## Create Account if needed and Get Token

```ts
if (wallet.acct) {
  token = await wallet.getToken(password);
} else {
  token = await wallet.createAcct(password); // optionally pass a mnemonic to import a known account
}

console.log(wallet.acct.addr);
console.log(Number(wallet.acctInfo.amount) / 10 ** 6);
```

## Test Transaction

```ts
const suggestedParams = await wallet.algod.getTransactionParams().do();
const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
  sender: wallet.acct.addr,
  receiver: wallet.acct.addr,
  amount: 0,
  suggestedParams,
});
const signedTxns = await wallet.signTxn(token.value, [txn]);
await wallet.algod.sendRawTransaction(signedTxns.map((stxn) => stxn.blob)).do();
console.log("Waiting for confirmation...");
await algosdk.waitForConfirmation(wallet.algod, signedTxns[0].txID, 4);

await wallet.getAcctInfo();
console.log(Number(wallet.acctInfo.amount) / 10 ** 6);
```
