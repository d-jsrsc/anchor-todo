import * as anchor from "@project-serum/anchor";
import { Program, IdlTypes } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

import { Todo, IDL } from "../target/types/todo";

const { SystemProgram, LAMPORTS_PER_SOL } = anchor.web3;

type User = {
  key: anchor.web3.Keypair;
  wallet: anchor.Wallet;
  provider: anchor.Provider;
};

describe("tree", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const mainProgram = anchor.workspace.Todo as Program<Todo>;

  const mintAuthority = anchor.web3.Keypair.generate();

  describe("new tree", () => {
    it("create a tree root!", async () => {
      const owner = await createUser();
      const mint = await getMint(owner);
      const tree = await createTree(owner, mint);
      console.log("####", tree);
      expect(tree.data.parentMint.toString(), "List name is set").equals(
        mint.toString()
      );
      expect(
        (tree.data.childrenMint as Array<null | anchor.web3.PublicKey>).length,
        "List has no items"
      ).equals(3);
    });

    it("a tree with a child", async () => {
      const owner = await createUser();
      const rootMint = await getMint(owner);
      const childMint = await getMint(owner);

      const tree = await createTree(owner, rootMint);
      expect(tree.data.parentMint.toString(), "List name is set").equals(
        rootMint.toString()
      );
      expect(
        (tree.data.childrenMint as Array<null | anchor.web3.PublicKey>).length,
        "List has no items"
      ).equals(3);

      const childResult = await insertChildNode(rootMint, childMint, owner, 1);
      console.log(childResult);

      let program = programForUser(owner);
      let treeWithNode = await program.account.treeNode.fetch(tree.publicKey);
      console.log(treeWithNode);
      expect(treeWithNode.childrenMint[0], "List has no items").equals(null);
      expect(
        treeWithNode.childrenMint[1].toString(),
        "List has no items"
      ).equals(childMint.toString());
      expect(treeWithNode.childrenMint[2], "List has no items").equals(null);
    });

    it.only("a tree with a child extract", async () => {
      const owner = await createUser();
      const rootMint = await getMint(owner);
      const childMint = await getMint(owner);
      const { connection } = anchor.getProvider();

      const tree = await createTree(owner, rootMint);
      expect(tree.data.parentMint.toString(), "List name is set").equals(
        rootMint.toString()
      );
      expect(
        (tree.data.childrenMint as Array<null | anchor.web3.PublicKey>).length,
        "List has no items"
      ).equals(3);

      const childResult = await insertChildNode(rootMint, childMint, owner, 1);
      console.log(childResult);
      const { parentPDA, mintTokenAccount } = childResult;

      let program = programForUser(owner);
      let treeWithNode = await program.account.treeNode.fetch(tree.publicKey);
      console.log(treeWithNode);
      expect(treeWithNode.childrenMint[0], "List has no items").equals(null);
      expect(
        treeWithNode.childrenMint[1].toString(),
        "List has no items"
      ).equals(childMint.toString());
      expect(treeWithNode.childrenMint[2], "List has no items").equals(null);

      await extractTreeNode(childMint, parentPDA, owner);
      const account = await getAccount(connection, mintTokenAccount.address);
      console.log("account", account.owner.toString());
      treeWithNode = await program.account.treeNode.fetch(tree.publicKey);
      console.log(treeWithNode);
    });
  });

  async function getAccountBalance(pubkey) {
    let account = await provider.connection.getAccountInfo(pubkey);
    return account?.lamports ?? 0;
  }

  async function getMint(user: User) {
    const mint = await createMint(
      anchor.getProvider().connection,
      user.key,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0
    );
    return mint;
  }

  async function createUser(airdropBalance?: number): Promise<{
    key: anchor.web3.Keypair;
    wallet: anchor.Wallet;
    provider: anchor.Provider;
  }> {
    airdropBalance = airdropBalance ?? 10 * LAMPORTS_PER_SOL;

    let user = anchor.web3.Keypair.generate();

    let sig = await provider.connection.requestAirdrop(
      user.publicKey,
      airdropBalance
    );

    const result = await provider.connection.confirmTransaction(
      sig,
      "processed"
    );

    const balance = await getAccountBalance(user.publicKey);

    let wallet = new anchor.Wallet(user);
    let userProvider = new anchor.Provider(
      provider.connection,
      wallet,
      provider.opts
    );

    return {
      key: user,
      wallet,
      provider: userProvider,
    };
  }

  function createUsers(numUsers: number) {
    let promises = [];
    for (let i = 0; i < numUsers; i++) {
      promises.push(createUser());
    }
    return Promise.all(promises);
  }

  function programForUser(user: User) {
    return new anchor.Program(
      mainProgram.idl,
      mainProgram.programId,
      user.provider
    );
  }

  async function createTree(owner: User, mint: anchor.web3.PublicKey) {
    const [treeRootPDA, treeRootBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("node_pda_seed"),
          owner.key.publicKey.toBytes(),
          mint.toBytes(),
        ],
        mainProgram.programId
      );

    const mintTokenAccount = await getOrCreateAssociatedTokenAccount(
      anchor.getProvider().connection,
      owner.key,
      mint,
      owner.key.publicKey
    );

    await mintTo(
      anchor.getProvider().connection,
      owner.key,
      mint,
      mintTokenAccount.address,
      mintAuthority,
      1,
      []
    );

    let program = programForUser(owner);
    const result = await program.rpc.newTree(treeRootBump, {
      accounts: {
        node: treeRootPDA,
        mint,
        mintTokenAccount: mintTokenAccount.address,
        user: owner.key.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });
    console.log("result", result);
    let tree = await program.account.treeNode.fetch(treeRootPDA);
    return { publicKey: treeRootPDA, data: tree };
  }

  async function insertChildNode(
    parentMint: anchor.web3.PublicKey,
    mint: anchor.web3.PublicKey,
    user: User,
    index: number
  ) {
    const [currPDA, currBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("node_pda_seed"),
        user.key.publicKey.toBytes(),
        mint.toBytes(),
      ],
      mainProgram.programId
    );

    const [parentPDA, parentBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("node_pda_seed"),
          user.key.publicKey.toBytes(),
          parentMint.toBytes(),
        ],
        mainProgram.programId
      );

    const connection = anchor.getProvider().connection;
    const mintTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      user.key,
      mint,
      user.key.publicKey
    );

    await mintTo(
      connection,
      user.key,
      mint,
      mintTokenAccount.address,
      mintAuthority,
      1,
      []
    );
    const account0 = await getAccount(connection, mintTokenAccount.address);
    console.log("account", account0.owner.toString());

    let program = programForUser(user);
    const result = await program.rpc.injectTreeNode(index, currBump, {
      accounts: {
        node: currPDA,
        parent: parentPDA,
        mint,
        mintTokenAccount: mintTokenAccount.address,

        user: user.key.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const account = await getAccount(connection, mintTokenAccount.address);
    console.log("account", account.owner.toString());
    let tree = await program.account.treeNode.fetch(parentPDA);
    return { publicKey: currPDA, tree, parentPDA, mintTokenAccount };
  }

  async function extractTreeNode(
    mint: anchor.web3.PublicKey,
    parent: anchor.web3.PublicKey,
    user: User
  ) {
    const { connection } = anchor.getProvider();
    const [nodePDA, nodeBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("node_pda_seed"),
        user.key.publicKey.toBytes(),
        mint.toBytes(),
      ],
      mainProgram.programId
    );

    const info = await connection.getAccountInfo(mint);
    const tokenAccountBalancePair = await connection.getTokenLargestAccounts(
      mint
    );
    const lastTokenAccountBalancePair = tokenAccountBalancePair.value[0];
    console.log({ mintInfo: info, lastTokenAccountBalancePair });
    let program = programForUser(user);
    const result = await program.rpc.extractTreeNode({
      accounts: {
        node: nodePDA,
        parent,
        mint,
        mintTokenAccount: lastTokenAccountBalancePair.address,
        user: user.key.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });
    console.log({ result });
  }
});
