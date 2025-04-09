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
          :text="wallet.isLocked() ? 'Unlock' : 'Lock'"
          @click="wallet.isLocked() ? unlock() : lock()"
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
import { AlgorandClient, microAlgos } from "@algorandfoundation/algokit-utils";
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
const algorand = AlgorandClient.fromClients({
  algod: wallet.algod as algosdk.Algodv2,
});

onMounted(async () => {
  await wallet.startup();
});

function newWallet() {
  showPass.value = true;
  passAction.value = "new";
}

function importWallet() {
  showPass.value = true;
  passAction.value = "import";
}

function exportWallet() {
  showPass.value = true;
  passAction.value = "export";
}

function clearWallet() {
  wallet.clearAcct();
}

function unlock() {
  showPass.value = true;
  passAction.value = "token";
}

function lock() {
  wallet.lock();
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
  try {
    const noteArray = crypto.getRandomValues(new Uint8Array(12));
    const note = Buffer.from(noteArray).toString("base64");
    const result = await algorand.send.payment({
      sender: wallet.acct.addr,
      receiver: wallet.acct.addr,
      amount: microAlgos(0),
      signer: wallet.signer,
      note,
    });
    console.log("Confirmed in round " + result.confirmation.confirmedRound);
    await wallet.refresh();
  } catch (err: any) {
    console.error(err.message);
  }
}
</script>
