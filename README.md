# MPL Hybrid 404 UI Template

This is a downloadable reusable UI template that utilizes Nextjs and Tailwind for the front end framework while also being preinstalled with Metaplex Umi, Solana WalletAdapter, and Zustand global store for ease of use.


![WebUI Preview](./template-image.jpg)

## Features

- Nextjs React framework
- Tailwind
- Shadcn Component Library
- Solana WalletAdapter
- Metaplex Umi
- Zustand
- Dark/Light Mode
- Umi Helpers
- MPL Hybrid 404 Integration
- Escrow Management

## Installation

```
git clone https://github.com/metaplex-foundation/mpl-hybrid-404-ui-template-nextjs-tailwind-shadcn.git
```

## Setup

### .env File

Rename `.env.example` to `.env`

Fill out the following with the correct details.

```shell
// Escrow Account
NEXT_PUBLIC_ESCROW="11111111111111111111111111111111"
NEXT_PUBLIC_COLLECTION="11111111111111111111111111111111"
NEXT_PUBLIC_TOKEN="11111111111111111111111111111111"

// RPC URL
NEXT_PUBLIC_RPC="https://myrpc.com/?api-key="
```

### Image Replacement

In `src/assets/images/` there are two images to replace:

- collectionImage.jpg
- token.jpg

Both of these images are used to save fetching the collection and token Metadata just to access the image uri.

## Escrow Management

You can manage your escrow by visiting the `/escrow` address which will load up the escrow management page where you can

- get and overview of the escrow settings.
- edit and update the escrow settings.
- view the amount of tokens held in escrow.
- view the Core NFT Assets that are held in escrow.

## UI Documentation

Beyond this point is generic documentation for the UI itself regarding its setup and use of state management.

- Why Zustand?
- Access Umi in .tsx
- Access Umi in .ts
- Umi Helpers
- Component Library

## Why Zustand?

Zustand is a global store that allows you to access the store state from both hooks and regular state fetching.

By storing the umiInstance in **zustand** we can access it in both `ts` and `tsx` files while also having the state update via other providers and hooks such as walletAdapter.

While it's normally easier to use the helper methods below to access umi you can also access the state methods manually by calling for the `umiStore` state yourself.

When fetching the umi state directly without a helper it will only pickup the umi instance and not the latest signer. By design when the walletAdapter changes state the state of the `signer` in the `umiStore` is updated but **NOT** applied to the `umi` state. So you will need to also pull the latest `signer` state and apply it to `umi`. This behavior can be outlined in the `umiProvider.tsx` file. The helpers always pull a fresh instance of the `signer` state.

```ts
// umiProvider.tsx snippet
useEffect(() => {
  if (!wallet.publicKey) return
  // When wallet.publicKey changes, update the signer in umiStore with the new wallet adapter.
  umiStore.updateSigner(wallet as unknown as WalletAdapter)
}, [wallet.publicKey])
```

### Access Umi in .tsx

```ts
// Pulls the umi state from the umiStore using hook.
const umi = useUmiStore().umi
const signer = useUmiStore().signer

umi.use(signerIdentity(signer))
```

### Access Umi in .ts

```ts
// Pulls umi state from the umiStore.
const umi = useUmiStore.getState().umi
const signer = useUmiStore.getState().signer

umi.use(signerIdentity(signer))
```

## Helpers

Stored in the `/lib/umi` folder there are some pre made helps you can use to make your development easier.

Umi is split up into several components which can be called in different scenarios.

#### sendAndConfirmWithWalletAdapter()

Passing a transaction into `sendAndConfirmWithWalletAdapter()` will send the transaction while pulling the latest walletAdapter state from the zustand `umiStore` and will return the signature as a `string`. This can be accessed in both `.ts` and `.tsx` files.

The function also provides and locks in the commitment level across `blockhash`, `send`, and `confirm` if provided. By default `confirmed` is used.

We also have a `skipPreflight` flag that can be enabled.

If using priority fees it would best to set them here so they can globally be used by the send function or to remove them entirely if you do not wish to use them.

```ts
import useUmiStore from '@/store/useUmiStore'
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, signerIdentity } from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'

const sendAndConfirmWalletAdapter = async (
  tx: TransactionBuilder,
  settings?: {
    commitment?: 'processed' | 'confirmed' | 'finalized'
    skipPreflight?: boolean
  }
) => {
  const umi = useUmiStore.getState().umi
  const currentSigner = useUmiStore.getState().signer
  console.log('currentSigner', currentSigner)
  umi.use(signerIdentity(currentSigner!))

  const blockhash = await umi.rpc.getLatestBlockhash({
    commitment: settings?.commitment || 'confirmed',
  })

  const transactions = tx
    // Set the priority fee for your transaction. Can be removed if unneeded.
    .add(setComputeUnitPrice(umi, { microLamports: BigInt(100000) }))
    .setBlockhash(blockhash)

  const signedTx = await transactions.buildAndSign(umi)

  const signature = await umi.rpc
    .sendTransaction(signedTx, {
      preflightCommitment: settings?.commitment || 'confirmed',
      commitment: settings?.commitment || 'confirmed',
      skipPreflight: settings?.skipPreflight || false,
    })
    .catch((err) => {
      throw new Error(`Transaction failed: ${err}`)
    })

  const confirmation = await umi.rpc.confirmTransaction(signature, {
    strategy: { type: 'blockhash', ...blockhash },
    commitment: settings?.commitment || 'confirmed',
  })
  return {
    signature: base58.deserialize(signature),
    confirmation,
  }
}

export default sendAndConfirmWalletAdapter
```

#### umiWithCurrentWalletAdapter()

This fetches the current umi state with the current walletAdapter state from the `umiStore`. This is used to create transactions or perform operations with umi that requires the current wallet adapter user.

Can be used in both `.ts` and `.tsx` files

```ts
import useUmiStore from '@/store/useUmiStore'
import { signerIdentity } from '@metaplex-foundation/umi'

const umiWithCurrentWalletAdapter = () => {
  // Because Zustand is used to store the Umi instance, the Umi instance can be accessed from the store
  // in both hook and non-hook format. This is an example of a non-hook format that can be used in a ts file
  // instead of a React component file.

  const umi = useUmiStore.getState().umi
  const currentWallet = useUmiStore.getState().signer
  if (!currentWallet) throw new Error('No wallet selected')
  return umi.use(signerIdentity(currentWallet))
}
export default umiWithCurrentWalletAdapter
```

#### umiWithSigner()

`umiWithSigner()` allows you to pass in a signer element (`generateSigner()`, `createNoopSigner()`) and use it with the umi instance stored in the `umiStore` state.

```ts
import useUmiStore from '@/store/useUmiStore'
import { Signer, signerIdentity } from '@metaplex-foundation/umi'

const umiWithSigner = (signer: Signer) => {
  const umi = useUmiStore.getState().umi
  if (!signer) throw new Error('No Signer selected')
  return umi.use(signerIdentity(signer))
}

export default umiWithSigner
```

#### Example Transaction Using Helpers

Within the `/lib` folder you will find a `transferSol` example transaction that utilizes both the fetching of the umi state using `umiWithCurrentWalletAdapter()` and the sending of the generated transaction using `sendAndConfirmWithWalletAdapter()`.

By pulling state from the umi store with `umiWithCurrentWalletAdapter()` if any of our transaction args require the `signer` type this will be automatically pulled from the umi instance which is generated with walletAdapter. In this case the `from` account is determined by the current signer connected to umi (walletAdapter) and auto inferred in the transaction for us.

By then sending transaction with `sendAndConfirmWithWalletAdapter` the signing process will use the walletAdapter and ask the current user to signer the transaction. The transaction will be sent to the chain.

```ts
// Example of a function that transfers SOL from one account to another pulling umi
// from the useUmiStore in a ts file which is not a React component.

import { transferSol } from '@metaplex-foundation/mpl-toolbox'
import umiWithCurrentWalletAdapter from './umi/umiWithCurrentWalletAdapter'
import { publicKey, sol } from '@metaplex-foundation/umi'
import sendAndConfirmWalletAdapter from './umi/sendAndConfirmWithWalletAdapter'

// This function transfers SOL from the current wallet to a destination account and is callable
// from any tsx/ts or component file in the project because of the zustand global store setup.

const transferSolToDestination = async ({
  destination,
  amount,
}: {
  destination: string
  amount: number
}) => {
  // Import Umi from `umiWithCurrentWalletAdapter`.
  const umi = umiWithCurrentWalletAdapter()

  // Create a transactionBuilder using the `transferSol` function from the mpl-toolbox.
  // Umi by default will use the current signer (walletAdapter) to also set the `from` account.
  const tx = transferSol(umi, {
    destination: publicKey(destination),
    amount: sol(amount),
  })

  // Use the sendAndConfirmWithWalletAdapter method to send the transaction.
  // We do not need to pass the umi stance or wallet adapter as an argument because a
  // fresh instance is fetched from the `umiStore` in the `sendAndConfirmWithWalletAdapter` function.
  const res = await sendAndConfirmWalletAdapter(tx)
}

export default transferSolToDestination
```

## Component Library

This template is setup to work with the Shadcn reusable components from [https://ui.shadcn.com/](https://ui.shadcn.com/).

Shadcn is preinstalled so you only need to install the required components you wish to use from the documentation [https://ui.shadcn.com/docs/](https://ui.shadcn.com/docs/)

## Theming

Theming is handled by Shadcn and Tailwind using `CSS Variables`. Documentation regarding theming can be found here [https://ui.shadcn.com/docs/theming](https://ui.shadcn.com/docs/theming) and on Tailwinds website [https://tailwindcss.com/docs/](https://tailwindcss.com/docs/)