import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RentairMint } from "../target/types/skytrade_mint";
import { PublicKey, associatedTokenProgram, tokenProgram } from "@metaplex-foundation/js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ValidDepthSizePair, createAllocTreeIx } from "@solana/spl-account-compression";

describe("skytrade-mint", () => {
  // Configure the client to use the local cluster.
  let provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let signer = provider.wallet as anchor.Wallet;
  const program = anchor.workspace.RentairMint as Program<RentairMint>;
  const merkleTree = anchor.web3.Keypair.generate();
  const mplTokenProgram = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const bubblegumProgram = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
  const compressionProgram = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
  const noopProgram = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

  const [collectionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("Collection")],
    program.programId
  );

  it("Is initialized!", async () => {
    let metadata = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mplTokenProgram.toBuffer(),
        collectionPDA.toBuffer(),
      ],
      mplTokenProgram,
    );
    let masterEdition = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        mplTokenProgram.toBuffer(),
        collectionPDA.toBuffer(),
        Buffer.from("edition")
      ],
      mplTokenProgram,
    );

    let signerAta = getAssociatedTokenAddressSync(collectionPDA, signer.publicKey);
    console.log("signerAta: ", signerAta.toBase58());

    let [treeAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        merkleTree.publicKey.toBuffer(),
      ],
      bubblegumProgram,
    );

    const maxDepthSizePair: ValidDepthSizePair = {
      maxDepth: 14,
      maxBufferSize: 64,
    };
    const canopyDepth = maxDepthSizePair.maxDepth - 5;


    // instruction to create new account with required space for tree
    const allocTreeIx = await createAllocTreeIx(
      provider.connection,
      merkleTree.publicKey,
      signer.publicKey,
      maxDepthSizePair,
      canopyDepth
    );

    const createTreeTx = new anchor.web3.Transaction().add(allocTreeIx)


    const txSignature = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      createTreeTx,
      [signer.payer, merkleTree],
      {
        commitment: "confirmed",
      }
    )


    // Init collection and tree onchain.
    const tx = await program.methods.initialize()
      .accounts({
        associatedTokenProgram: associatedTokenProgram.address,
        authority: signer.publicKey,
        collectionMint: collectionPDA,
        masterEdition: masterEdition[0],
        metadataAccount: metadata[0],
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: tokenProgram.address,
        tokenMetadataProgram: mplTokenProgram,
        tokenAccount: signerAta,
        bubblegumProgram: bubblegumProgram,
        treeAuthority: treeAuthority,
        merkleTree: merkleTree.publicKey,
        logWrapper: noopProgram,
        compressionProgram: compressionProgram,
      }).signers([signer.payer]).rpc();

    const treeTx = await program.methods.initializeTree()
      .accounts({
        authority: signer.publicKey,
        collectionMint: collectionPDA,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        bubblegumProgram: bubblegumProgram,
        treeAuthority: treeAuthority,
        merkleTree: merkleTree.publicKey,
        logWrapper: noopProgram,
        compressionProgram: compressionProgram,
      }).signers([signer.payer]).rpc();

    console.log("Your transaction signature", tx);

  });

  it("Is minting!", async () => {
    mintToken(program, merkleTree, signer).then((tx) => {
      console.log("Your transaction signature", tx);
    });
  });
});

async function mintToken(program: Program<RentairMint>, merkleTree: anchor.web3.Keypair, signer: anchor.web3.Keypair): Promise<string | void> {
  const [collectionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("Collection")],
    program.programId
  );

  const mplTokenProgram = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const bubblegumProgram = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
  const compressionProgram = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
  const noopProgram = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

  let metadata = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      mplTokenProgram.toBuffer(),
      collectionPDA.toBuffer(),
    ],
    mplTokenProgram,
  );
  let masterEdition = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      mplTokenProgram.toBuffer(),
      collectionPDA.toBuffer(),
      Buffer.from("edition")
    ],
    mplTokenProgram,
  );

  let [treeAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      merkleTree.publicKey.toBuffer(),
    ],
    bubblegumProgram,
  );
  const [bubblegumSigner] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection_cpi", "utf8")],
    bubblegumProgram
  )


  let retries = 10;
  let txResult: string | void;
  let error: any = undefined;
  while (retries > 0) {

    try {
      const tx = await program.methods.mint()
        .accounts({
          payer: signer.publicKey,
          collectionMint: collectionPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
          bubblegumProgram: bubblegumProgram,
          treeAuthority: treeAuthority,
          merkleTree: merkleTree.publicKey,
          logWrapper: noopProgram,
          compressionProgram: compressionProgram,
          collectionMetadata: metadata[0],
          editionAccount: masterEdition[0],
          tokenMetadataProgram: mplTokenProgram,
          bubblegumSigner: bubblegumSigner,

        }).signers([signer]).rpc()
      txResult = tx;
      error = undefined;
    }
    catch (err) {
      retries--;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      error = err;
    }
  }
  if (error) {
    throw error;
  }
  return txResult;
}