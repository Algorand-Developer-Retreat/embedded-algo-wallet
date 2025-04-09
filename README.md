# embedded-algo-wallet

A minimal TS package to embed a hot wallet into a dApp

**WARNING: You should not be storing private keys for wallets that hold large monetary values. Browser storage is inherently less secure than other methods. This library is intended mainly for burner/hot wallets.**

## Overview

This library is inteded to help with storing private keys in web applications that use the Algorand blockchain but prefer to simplify the signing process to button presses instead of the usual wallet signing method.

This approach should be used only with accounts generated for the sole purpose of usage inside your application.

## Getting Started

```sh
pnpm i
pnpm build
pnpm example:vue
```
