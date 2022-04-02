import * as anchor from "@project-serum/anchor";
import { Program, IdlTypes } from "@project-serum/anchor";
import { TypeDef } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import BN from "bn.js";
import { expect } from "chai";

import { Todo, IDL } from "../target/types/todo";

const { SystemProgram, LAMPORTS_PER_SOL } = anchor.web3;

type User = {
  key: anchor.web3.Keypair;
  wallet: anchor.Wallet;
  provider: anchor.Provider;
};

describe.skip("todo", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const mainProgram = anchor.workspace.Todo as Program<Todo>;

  describe("new list", () => {
    it("create a list !", async () => {
      const owner = await createUser();
      let list = await createList(owner, "A list");

      expect(list.data.listOwner.toString(), "List owner is set").equals(
        owner.key.publicKey.toString()
      );
      expect(list.data.name, "List name is set").equals("A list");
      expect(list.data.lines.length, "List has no items").equals(0);
    });
  });

  describe("add", () => {
    it("Anyone can add an item to a list", async () => {
      const [owner, adder] = await createUsers(2);
      const adderStartingBalance = await getAccountBalance(adder.key.publicKey);
      const list = await createList(owner, "list");

      const result = await addItem({
        listName: list.data.name,
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        user: adder,
        name: "Do something",
        bounty: 1 * LAMPORTS_PER_SOL,
      });

      expect(result.list.data.lines, "item is added").deep.equals([
        result.item.pda,
      ]);
      expect(
        result.item.data.creator.toString(),
        "Item marked with creator"
      ).equals(adder.key.publicKey.toString());
      expect(
        result.item.data.creatorFinished,
        "creator_finished is false"
      ).equals(false);
      expect(
        result.item.data.listOwnerFinished,
        "list_owner_finished is false"
      ).equals(false);
      expect(result.item.data.name, "Name is set").equals("Do something");
      expect(
        await getAccountBalance(result.item.pda),
        "List account balance"
      ).equals(1 * LAMPORTS_PER_SOL);

      let adderNewBalance = await getAccountBalance(adder.key.publicKey);
      expectBalance(
        adderStartingBalance - adderNewBalance,
        LAMPORTS_PER_SOL,
        "Number of lamports removed from adder is equal to bounty"
      );

      // Test that another add works
      const again = await addItem({
        listName: list.data.name,
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        user: adder,
        name: "Another item",
        bounty: 1 * LAMPORTS_PER_SOL,
      });
      expect(again.list.data.lines, "Item is added").deep.equals([
        result.item.pda,
        again.item.pda,
      ]);
    });

    it("fails if the list is full", async () => {
      const MAX_LIST_SIZE = 4;
      const owner = await createUser();
      const list = await createList(owner, "list", MAX_LIST_SIZE);

      await Promise.all(
        new Array(MAX_LIST_SIZE).fill("").map((_, i) => {
          return addItem({
            listName: list.data.name,
            listPDA: list.publicKey,
            listOwner: list.data.listOwner,
            user: owner,
            name: `Item ${i}`,
            bounty: 1 * LAMPORTS_PER_SOL,
          });
        })
      );

      const adderStartingBalance = await getAccountBalance(owner.key.publicKey);

      try {
        let addResult = await addItem({
          listName: list.data.name,
          listPDA: list.publicKey,
          listOwner: list.data.listOwner,
          user: owner,
          name: "Full item",
          bounty: 1 * LAMPORTS_PER_SOL,
        });
        console.dir(addResult, { depth: null });
        expect.fail("Adding to full list should have failed");
      } catch (e) {
        expect(e.toString()).contains("This list is full");
      }

      let adderNewBalance = await getAccountBalance(owner.key.publicKey);
      expect(adderStartingBalance, "Adder balance is unchanged").equals(
        adderNewBalance
      );
    });

    it("fails if the bounty is smaller than the rent-exempt amount", async () => {
      const owner = await createUser();
      const list = await createList(owner, "list");
      const adderStartingBalance = await getAccountBalance(owner.key.publicKey);

      try {
        await addItem({
          listName: list.data.name,
          listPDA: list.publicKey,
          listOwner: list.data.listOwner,
          user: owner,
          name: "Small bounty item",
          bounty: 10,
        });
        expect.fail("Should have failed");
      } catch (e) {
        expect(e.toString()).equals(
          "Bounty must be enough to mark account rent-exempt"
        );
      }

      let adderNewBalance = await getAccountBalance(owner.key.publicKey);
      expect(adderStartingBalance, "Adder balance is unchanged").equals(
        adderNewBalance
      );
    });
  });

  describe("cancel", () => {
    it("List owner can cancel an item", async () => {
      const [owner, adder] = await createUsers(2);
      const list = await createList(owner, "list");

      const adderStartingBalance = await getAccountBalance(adder.key.publicKey);

      const result = await addItem({
        listName: list.data.name,
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        user: adder,
        bounty: LAMPORTS_PER_SOL,
        name: "An item",
      });

      const adderBalanceAfterAdd = await getAccountBalance(adder.key.publicKey);

      expect(result.list.data.lines, "Item is added to list").deep.equals([
        result.item.pda,
      ]);
      expect(adderBalanceAfterAdd, "Bounty is removed from adder").lt(
        adderStartingBalance
      );

      const cancelResult = await cancelItem({
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        itemPDA: result.item.pda,
        itemCreator: adder,
        user: owner,
      });

      const adderBalanceAfterCancel = await getAccountBalance(
        adder.key.publicKey
      );
      expectBalance(
        adderBalanceAfterCancel,
        adderBalanceAfterAdd + LAMPORTS_PER_SOL,
        "Cancel returns bounty to adder"
      );
      expect(
        cancelResult.list.data.lines,
        "Cancel removes item from list"
      ).deep.equals([]);
    });

    it("Item creator can cancel an item", async () => {
      const [owner, adder] = await createUsers(2);
      const list = await createList(owner, "list");
      const adderStartingBalance = await getAccountBalance(adder.key.publicKey);

      const result = await addItem({
        listName: list.data.name,
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        user: adder,
        bounty: LAMPORTS_PER_SOL,
        name: "An item",
      });

      const adderBalanceAfterAdd = await getAccountBalance(adder.key.publicKey);

      expect(result.list.data.lines, "Item is added to list").deep.equals([
        result.item.pda,
      ]);
      expect(adderBalanceAfterAdd, "Bounty is removed from adder").lt(
        adderStartingBalance
      );

      const cancelResult = await cancelItem({
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        itemPDA: result.item.pda,
        itemCreator: adder,
        user: adder,
      });

      const adderBalanceAfterCancel = await getAccountBalance(
        adder.key.publicKey
      );
      expectBalance(
        adderBalanceAfterCancel,
        adderBalanceAfterAdd + LAMPORTS_PER_SOL,
        "Cancel returns bounty to adder"
      );
      expect(
        cancelResult.list.data.lines,
        "Cancel removes item from list"
      ).deep.equals([]);
    });

    it("item_creator key must match the key in the item account", async () => {
      const [owner, adder] = await createUsers(2);
      const list = await createList(owner, "list");

      const result = await addItem({
        listName: list.data.name,
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        user: adder,
        bounty: LAMPORTS_PER_SOL,
        name: "An item",
      });

      expect(result.list.data.lines, "Item is added to list").deep.equals([
        result.item.pda,
      ]);

      try {
        await cancelItem({
          listPDA: list.publicKey,
          listOwner: list.data.listOwner,
          itemPDA: result.item.pda,
          itemCreator: owner, // Wrong creator
          user: owner,
        });
        expect.fail(`Listing the wrong item creator should fail`);
      } catch (e) {
        // expect(e.toString(), "Error message").equals(
        //   "Specified item creator does not match the pubkey in the item"
        // );
        expect(e.toString(), "Error message").equals(
          "A seeds constraint was violated"
        );
      }
    });

    it("Can not cancel an item that is not in the given list", async () => {
      const [owner, adder] = await createUsers(2);
      const [list1, list2] = await Promise.all([
        createList(owner, "list1"),
        createList(owner, "list2"),
      ]);

      const result = await addItem({
        listName: list1.data.name,
        listPDA: list1.publicKey,
        listOwner: list1.data.listOwner,
        user: adder,
        bounty: LAMPORTS_PER_SOL,
        name: "An item",
      });

      try {
        await cancelItem({
          listPDA: list2.publicKey,
          listOwner: list2.data.listOwner,
          itemPDA: result.item.pda, // Wrong list
          itemCreator: adder,
          user: owner,
        });
        expect.fail(`Cancelling from the wrong list should fail`);
      } catch (e) {
        expect(e.toString(), "Error message").equals(
          "Item does not belong to this todo list"
        );
      }
    });
  });

  describe("finish", () => {
    it("List owner then item creator", async () => {
      const [owner, adder] = await createUsers(2);
      const list = await createList(owner, "list");
      const ownerInitial = await getAccountBalance(owner.key.publicKey);

      const bounty = 5 * LAMPORTS_PER_SOL;
      const { item } = await addItem({
        listName: list.data.name,
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        user: adder,
        bounty,
        name: "An item",
      });

      expect(
        await getAccountBalance(item.pda),
        "initialized account has bounty"
      ).equals(bounty);

      const firstResult = await finishItem({
        listPDA: list.publicKey,
        itemPDA: item.pda,
        user: owner,
        listOwner: owner,
      });

      expect(
        firstResult.list.data.lines,
        "Item still in list after first finish"
      ).deep.equals([item.pda]);
      expect(
        firstResult.item.data.creatorFinished,
        "Creator finish is false after owner calls finish"
      ).equals(false);
      expect(
        firstResult.item.data.listOwnerFinished,
        "Owner finish flag gets set after owner calls finish"
      ).equals(true);
      expect(
        await getAccountBalance(firstResult.item.pda),
        "Bounty remains on item after one finish call"
      ).equals(bounty);

      const finishResult = await finishItem({
        listPDA: list.publicKey,
        itemPDA: item.pda,
        user: adder,
        listOwner: owner,
        expectAccountClosed: true,
      });

      expect(
        finishResult.list.data.lines,
        "Item removed from list after both finish"
      ).deep.equals([]);
      expect(
        await getAccountBalance(finishResult.item.pda),
        "Bounty remains on item after one finish call"
      ).equals(0);
      expectBalance(
        await getAccountBalance(owner.key.publicKey),
        ownerInitial + bounty,
        "Bounty transferred to owner"
      );
    });

    it("Item creator then list owner", async () => {
      const [owner, adder] = await createUsers(2);
      const list = await createList(owner, "list");

      const ownerInitial = await getAccountBalance(owner.key.publicKey);
      const bounty = 5 * LAMPORTS_PER_SOL;
      const { item } = await addItem({
        listPDA: list.publicKey,
        listName: list.data.name,
        listOwner: list.data.listOwner,
        user: adder,
        bounty,
        name: "An item",
      });

      expect(
        await getAccountBalance(item.pda),
        "initialized account has bounty"
      ).equals(bounty);

      const firstResult = await finishItem({
        listPDA: list.publicKey,
        itemPDA: item.pda,
        user: adder,
        listOwner: owner,
      });

      expect(
        firstResult.list.data.lines,
        "Item still in list after first finish"
      ).deep.equals([item.pda]);
      expect(
        firstResult.item.data.creatorFinished,
        "Creator finish is true after creator calls finish"
      ).equals(true);
      expect(
        firstResult.item.data.listOwnerFinished,
        "Owner finish flag is false after creator calls finish"
      ).equals(false);
      expect(
        await getAccountBalance(firstResult.item.pda),
        "Bounty remains on item after one finish call"
      ).equals(bounty);

      const finishResult = await finishItem({
        listPDA: list.publicKey,
        itemPDA: item.pda,
        user: owner,
        listOwner: owner,
        expectAccountClosed: true,
      });
      expect(
        finishResult.list.data.lines,
        "Item removed from list after both finish"
      ).deep.equals([]);
      expect(
        await getAccountBalance(finishResult.item.pda),
        "Bounty remains on item after one finish call"
      ).equals(0);
      expectBalance(
        await getAccountBalance(owner.key.publicKey),
        ownerInitial + bounty,
        "Bounty transferred to owner"
      );
    });

    it("Other users can not call finish", async () => {
      const [owner, adder, otherUser] = await createUsers(3);

      const list = await createList(owner, "list");

      const bounty = 5 * LAMPORTS_PER_SOL;
      const { item } = await addItem({
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        listName: list.data.name,
        user: adder,
        bounty,
        name: "An item",
      });

      try {
        await finishItem({
          listPDA: list.publicKey,
          itemPDA: item.pda,
          user: otherUser,
          listOwner: owner,
        });
        expect.fail("Finish by other user should have failed");
      } catch (e) {
        expect(e.toString(), "error message").equals(
          "Only the list owner or item creator may finish an item"
        );
      }

      expect(
        await getAccountBalance(item.pda),
        "Item balance did not change"
      ).equal(bounty);
    });

    it("Can not call finish on an item that is not in the given list", async () => {
      const [owner, adder, otherUser] = await createUsers(3);

      const [list1, list2] = await Promise.all([
        createList(owner, "list1"),
        createList(owner, "list2"),
      ]);

      const bounty = 5 * LAMPORTS_PER_SOL;
      const { item } = await addItem({
        listPDA: list1.publicKey,
        listOwner: list1.data.listOwner,
        listName: list1.data.name,
        user: adder,
        bounty,
        name: "An item",
      });

      try {
        await finishItem({
          listPDA: list2.publicKey,
          itemPDA: item.pda,
          user: otherUser,
          listOwner: owner,
        });
        expect.fail("Finish by other user should have failed");
      } catch (e) {
        expect(e.toString(), "error message").equals(
          "Item does not belong to this todo list"
        );
      }

      expect(
        await getAccountBalance(item.pda),
        "Item balance did not change"
      ).equal(bounty);
    });

    it("Can not call finish with the wrong list owner", async () => {
      const [owner, adder] = await createUsers(2);

      const list = await createList(owner, "list1");

      const bounty = 5 * LAMPORTS_PER_SOL;
      const { item } = await addItem({
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        listName: list.data.name,
        user: adder,
        bounty,
        name: "An item",
      });

      try {
        await finishItem({
          listPDA: list.publicKey,
          itemPDA: item.pda,
          user: owner,
          listOwner: adder,
        });

        expect.fail("Finish by other user should have failed");
      } catch (e) {
        expect(e.toString(), "error message").equals(
          "A seeds constraint was violated"
        );
      }

      expect(
        await getAccountBalance(item.pda),
        "Item balance did not change"
      ).equal(bounty);
    });

    it("Can not call finish on an already-finished item", async () => {
      const [owner, adder] = await createUsers(2);

      const list = await createList(owner, "list");
      const ownerInitial = await getAccountBalance(owner.key.publicKey);

      const bounty = 5 * LAMPORTS_PER_SOL;
      const { item } = await addItem({
        listPDA: list.publicKey,
        listOwner: list.data.listOwner,
        listName: list.data.name,
        user: adder,
        bounty,
        name: "An item",
      });

      expect(
        await getAccountBalance(item.pda),
        "initialized account has bounty"
      ).equals(bounty);

      await Promise.all([
        finishItem({
          listPDA: list.publicKey,
          itemPDA: item.pda,
          user: owner,
          listOwner: owner,
          expectAccountClosed: true,
        }),

        finishItem({
          listPDA: list.publicKey,
          itemPDA: item.pda,
          user: adder,
          listOwner: owner,
          expectAccountClosed: true,
        }),
      ]);

      try {
        await finishItem({
          listPDA: list.publicKey,
          itemPDA: item.pda,
          user: owner,
          listOwner: owner,
          expectAccountClosed: true,
        });

        expect.fail("Finish on an already-closed item should fail");
      } catch (e) {
        // expect(e.toString(), "error message").equal(
        //   "The given account is not owned by the executing program"
        // );
        expect(e.toString(), "error message").equal(
          "The program expected this account to be already initialized"
        );
      }

      expectBalance(
        await getAccountBalance(owner.key.publicKey),
        ownerInitial + bounty,
        "Bounty transferred to owner just once"
      );
    });
  });

  async function getAccountBalance(pubkey) {
    let account = await provider.connection.getAccountInfo(pubkey);
    return account?.lamports ?? 0;
  }

  function expectBalance(actual, expected, message, slack = 20000) {
    expect(actual, message).within(expected - slack, expected + slack);
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

    // const balance = await getAccountBalance(user.publicKey);

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

  async function createList(owner: User, name: string, capacity = 16) {
    const [listAccount, listBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("todolist"),
          owner.key.publicKey.toBytes(),
          Buffer.from(name.slice(0, 32)),
        ],
        mainProgram.programId
      );

    let program = programForUser(owner);
    await program.rpc.newList(name, capacity, listBump, {
      accounts: {
        list: listAccount,
        user: owner.key.publicKey,
        systemProgram: SystemProgram.programId,
      },
    });

    let list = await program.account.todoList.fetch(listAccount);
    return { publicKey: listAccount, data: list };
  }

  async function addItem({
    listName, // 做 seed，可以不用
    listPDA,
    listOwner,
    user,
    name,
    bounty,
  }: {
    listName: string;
    listPDA: any;
    listOwner: anchor.web3.PublicKey;
    user: User;
    name: string;
    bounty: number;
  }) {
    const [listItemPDA, listItemBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("todolistitem"),
          listOwner.toBytes(),
          user.key.publicKey.toBytes(),
          Buffer.from(name.slice(0, 32)),
        ],
        mainProgram.programId
      );

    let program = programForUser(user);
    await program.rpc.add(listName, name, new BN(bounty), {
      accounts: {
        list: listPDA,
        listOwner: listOwner,
        item: listItemPDA,
        user: user.key.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [user.key],
    });

    let [listData, itemData] = await Promise.all([
      program.account.todoList.fetch(listPDA),
      program.account.listItem.fetch(listItemPDA),
    ]);

    return {
      list: {
        pda: listPDA,
        data: listData,
      },
      item: {
        pda: listItemPDA,
        data: itemData,
      },
    };
  }

  async function cancelItem({
    listPDA,
    listOwner,
    itemPDA,
    itemCreator,
    user,
  }: {
    listPDA: anchor.web3.PublicKey;
    listOwner: anchor.web3.PublicKey;
    itemPDA: anchor.web3.PublicKey;
    itemCreator: any;
    user: User;
  }) {
    let program = programForUser(user);
    await program.rpc.cancel({
      accounts: {
        list: listPDA,
        listOwner,
        item: itemPDA,
        itemCreator: itemCreator.key.publicKey,
        user: user.key.publicKey,
      },
    });
    let listData = await program.account.todoList.fetch(listPDA);
    return {
      list: {
        pda: listPDA,
        data: listData,
      },
    };
  }

  async function finishItem({
    listPDA,
    listOwner,
    itemPDA,
    user,
    expectAccountClosed,
  }: {
    listPDA: anchor.web3.PublicKey;
    listOwner: User;
    itemPDA: anchor.web3.PublicKey;
    user: User;
    expectAccountClosed?: any;
  }) {
    let program = programForUser(user);
    await program.rpc.finish({
      accounts: {
        list: listPDA,
        listOwner: listOwner.key.publicKey,
        item: itemPDA,
        user: user.key.publicKey,
      },
    });
    let [listData, itemData] = await Promise.all([
      program.account.todoList.fetch(listPDA),
      expectAccountClosed
        ? null
        : await program.account.listItem.fetch(itemPDA),
    ]);
    return {
      list: {
        pda: listPDA,
        data: listData,
      },
      item: {
        pda: itemPDA,
        data: itemData,
      },
    };
  }

  async function sleep(sec: number) {
    await new Promise<void>((resolve, reject) => {
      setTimeout(resolve, sec * 1000);
    });
  }
});
