<template>
  <v-container>
    <v-row>
      <v-col>
        <v-card>
          <v-container class="pt-1 pb-0 pl-4 text-button">Wallet</v-container>
          <v-card-text class="pt-1 pb-3">
            <v-row>
              <v-col>
                <v-btn
                  text="New"
                  @click="newWallet()"
                  :disabled="!!wallet.acct"
                />
              </v-col>
              <v-col>
                <v-btn
                  text="Import"
                  @click="importWallet()"
                  :disabled="!!wallet.acct"
                />
              </v-col>
              <v-col>
                <v-btn
                  text="Export"
                  @click="exportWallet()"
                  :disabled="!wallet.acct"
                />
              </v-col>
              <v-col>
                <v-btn
                  text="Clear"
                  @click="clearWallet()"
                  :disabled="!wallet.acct"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="8">
        <v-card>
          <v-container class="pt-1 pb-0 pl-4 text-button">Address</v-container>
          <v-card-text class="pt-1 pb-3">
            <div style="font-family: monospace">
              {{ wallet.acct?.addr || "-" }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="4">
        <v-card>
          <v-container class="pt-1 pb-0 pl-4 text-button">Balance</v-container>
          <v-card-text class="pt-1 pb-3">
            {{
              wallet.acctInfo ? Number(wallet.acctInfo?.amount) / 10 ** 6 : "-"
            }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-btn
          text="Unlock"
          @click="unlock()"
          :disabled="!wallet.acct || !wallet.isLocked()"
        />
      </v-col>
      <v-col>
        <v-btn
          text="Send Test Txn"
          @click="testTxn()"
          :disabled="wallet.isLocked() || wallet.acctInfo?.amount < 101000n"
        />
      </v-col>
    </v-row>
    <v-dialog v-model="showPass" max-width="600" persistent>
      <v-card title="Enter Password">
        <v-container>
          <v-form ref="form" @submit.prevent="handlePassword()">
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              name="password"
              autocomplete="password"
              density="comfortable"
              :rules="[required]"
              autofocus
            />
            <v-textarea
              v-if="passAction === 'import'"
              v-model="mnemonic"
              rows="3"
              label="Mnemonic"
              :hint="mnemonicHint"
              persistent-hint
              :rules="[required, validMnemonic]"
            />
            <v-card-actions>
              <v-spacer />
              <v-btn text="Submit" type="submit" />
            </v-card-actions>
          </v-form>
        </v-container>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import algosdk from "algosdk";
import Wallet from "embedded-algo-wallet";
import { computed, onMounted, reactive, ref } from "vue";

const required = (v: string) => !!v || "Required";
const validMnemonic = () => !!mnemonicAcct.value?.addr || "Invalid Mnemonic";

const form = ref();
const password = ref();
const showPass = ref(false);
const passAction = ref();
const mnemonic = ref();
const mnemonicAcct = computed(() => {
  if (!mnemonic.value) return undefined;
  let val;
  try {
    val = algosdk.mnemonicToSecretKey(mnemonic.value);
  } catch {
    return undefined;
  }
  return val;
});
const mnemonicHint = computed(() => mnemonicAcct.value?.addr.toString());

const wallet = reactive(new Wallet("testnet"));

onMounted(async () => {
  await wallet.startup();
});

async function newWallet() {
  showPass.value = true;
  passAction.value = "new";
}

async function importWallet() {
  showPass.value = true;
  passAction.value = "import";
}

async function exportWallet() {
  showPass.value = true;
  passAction.value = "export";
}

function clearWallet() {
  wallet.clearAcct();
}

async function unlock() {
  showPass.value = true;
  passAction.value = "token";
}

async function handlePassword() {
  const { valid } = await form.value.validate();
  if (!valid) return;

  showPass.value = false;
  try {
    switch (passAction.value) {
      case "new": {
        await wallet.createAcct(password.value);
        break;
      }
      case "import": {
        await wallet.createAcct(password.value, mnemonic.value);
        mnemonic.value = undefined;
        break;
      }
      case "export": {
        console.log(await wallet.exportAcct(password.value));
        break;
      }
      case "token": {
        await wallet.unlock(password.value);
        break;
      }
    }
  } catch (err: any) {
    console.error(err.message);
  }
  password.value = undefined;
}

async function testTxn() {
  const suggestedParams = await wallet.algod.getTransactionParams().do();
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: wallet.acct.addr,
    receiver: wallet.acct.addr,
    amount: 0,
    suggestedParams,
  });
  const signedTxns = await wallet.txnSigner([txn], [0]);
  await wallet.algod.sendRawTransaction(signedTxns).do();
  console.log("Waiting for confirmation...");
  const resp = await algosdk.waitForConfirmation(
    wallet.algod as algosdk.Algodv2,
    txn.txID(),
    4
  );
  console.log("Confirmed in Round: " + resp.confirmedRound);
  await wallet.getAcctInfo();
}
</script>
