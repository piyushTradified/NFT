import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { percentAmount, generateSigner, createSignerFromKeypair, signerIdentity, keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { createNft, printSupply, fetchMasterEditionFromSeeds, mplTokenMetadata, printV1, transferV1, TokenStandard, fetchAllDigitalAssetByOwner, lockV1, burnV1 } from '@metaplex-foundation/mpl-token-metadata';
import fs from 'fs';
import path from 'path';
import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { PublicKey } from '@solana/web3.js';

// ** Setting Up Umi **
const umi = createUmi('https://api.devnet.solana.com'); // Specify the network (e.g., devnet, mainnet)

const privateKey = Uint8Array.from("-- secret key --");

// Create a Keypair from your private key
const myKeypair = umi.eddsa.createKeypairFromSecretKey(privateKey);

// const web3jsKeypair = toWeb3JsKeypair(myKeypair);
// console.log(web3jsKeypair);

const signer = createSignerFromKeypair(umi, myKeypair);
// umi.use(signerIdentity(signer));
umi.use(keypairIdentity(signer)).use(mplTokenMetadata());

// console.log("Using custom private key for transactions.");

// ** Create the Master Edition NFT (Black) **

const mint = generateSigner(umi); // Generate a signer for the Master Edition Mint

const createMasterEdition = async () => {
  const metadata = {
    name: "My Master Edition NFT",
    symbol: "NFT",
    description: "This is the master edition NFT of Black type.",
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/49/A_black_image.jpg', // Example image URL
    attributes: [
      { trait_type: "Color", value: "Black" },
      { trait_type: "StepBlock", value: 0 },
    ],
    collection: {
      name: "NFT Collection",
      family: "NFTs",
    },
  };

//   const uri = await umi.uploader.uploadJson(metadata); // Upload metadata for Master Edition
  
  const tx = await createNft(umi, {
    mint,
    name: metadata.name,
    uri: "https://stepsstamp.com/test_nft.json",  // Metadata URI
    sellerFeeBasisPoints: percentAmount(5.5), // Seller fee (royalty)
    printSupply: printSupply('Unlimited'), // Unlimited prints
  }).sendAndConfirm(umi);

  console.log(`Master Edition NFT Created: ${tx.signature}`);
  console.log("Master Edition Mint Address:", mint.publicKey.toString());
  return mint.publicKey.toString(); // Return Master Edition Mint Address
};

// ** Printing an Edition from the Master Edition **

const printEdition = async (masterEditionMint, recipient) => {
  const masterEdition = await fetchMasterEditionFromSeeds(umi, {
    mint: masterEditionMint,
  });

  const editionMint = generateSigner(umi);
  const ownerOfThePrintedEdition = new PublicKey(recipient); // The owner of the printed edition

  const tx = await printV1(umi, {
    masterTokenAccountOwner: signer.publicKey, // Original owner (Master Edition)
    masterEditionMint,
    editionMint,
    editionTokenAccountOwner: ownerOfThePrintedEdition,
    editionNumber: masterEdition.supply + 1n, // Increment edition number
    tokenStandard: 'NonFungible', // Ensuring it's non-fungible
  }).sendAndConfirm(umi);

  console.log(`Edition Created: ${tx.signature}`);
  console.log("Edition Mint Address:", editionMint.publicKey.toString());
  return editionMint.publicKey.toString();
};

const transfer = async (editionMintAddress, currentOwner, newOwner) => {
  try {
    const editionMint = new PublicKey(editionMintAddress);
    const newOwnerPublicKey = new PublicKey(newOwner);

    // Perform the transfer
    const tx = await transferV1(umi, {
      mint: editionMint, // The mint address of the NFT to transfer
      authority: currentOwner, // The current owner of the NFT (signer)
      tokenOwner: currentOwner.publicKey, // The current token owner public key
      destinationOwner: newOwnerPublicKey, // The new owner's public key
      tokenStandard: TokenStandard.NonFungible, // Specify NFT token standard
    }).sendAndConfirm(umi);

    console.log("Transfer Transaction Signature:", tx.signature);
    return tx.signature; // Return the transaction signature
  } catch (error) {
    console.error("Error during NFT transfer:", error);
    throw error;
  }
};
const lock = async (mintPublicKey) => {
  try {
    const editionMint = new PublicKey(mintPublicKey);

    // Lock the NFT using the lockV1 function
    const lockTransaction = await lockV1(umi, {
      editionMint,
      authority: signer,  // The signer (current owner or the one initiating the lock)
      tokenStandard: TokenStandard.NonFungible,  // Ensure it's Non-Fungible
    }).sendAndConfirm(umi);  // Send and confirm the transaction

    console.log("NFT locked successfully:", lockTransaction.signature);
    return lockTransaction;
  } catch (error) {
    console.error("Error locking NFT:", error);
    throw new Error(`Failed to lock NFT: ${error.message}`);
  }
};
// ** Main Execution **
const main = async () => {
  // const masterEditionAddress = await createMasterEdition(); // Create Master Edition
  // console.log("Master Edition Mint Address:", masterEditionAddress);

  // const editionAddress = await printEdition("6G4tYC7XwQr6NyKKJy7BPzAXP4mLTq3yr6YuBQHHcRgn", "DvQfW6nFrShS62M2G6jrACFtKyZ2P2sDsLT1cDJvT74k"); // Create Edition from Master Edition
  // console.log("Created Edition Mint Address:", editionAddress);

  // const transferSignature = await transfer(
  //   "FcSrY3dPugupH1Qr8ibDFH5TL5xNJQimcYD72VRtgaKf", // The printed edition's mint address
  //   test_signer, // Current owner (signer)
  //   "DvQfW6nFrShS62M2G6jrACFtKyZ2P2sDsLT1cDJvT74k" // New owner's public key
  // );
  // console.log("Transfer complete, signature:", transferSignature);

//   FcSrY3dPugupH1Qr8ibDFH5TL5xNJQimcYD72VRtgaKf
  const freezeNft = await lock("6G4tYC7XwQr6NyKKJy7BPzAXP4mLTq3yr6YuBQHHcRgn");
  console.log("Transfer complete, signature:", freezeNft);


  // Create MASTER NFT Done
  // print NFT from MASTER NFT and transfer to the payer Done
  // then allow them to transfer to anybody Done
  // allow freeze Pending
  
};

// Run the script
main().catch((err) => console.error("Error:", err));
