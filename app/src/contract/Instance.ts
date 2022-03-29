import * as anchor from "@project-serum/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { BN, Program, Provider, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import log from "loglevel";

import { NFTDataItem } from "./types";
import idl from "./idl.json";
import { Todo } from "./todo";

const logger = log.getLogger("ContractInstance");

const PROGRAM_ID = new PublicKey(idl.metadata.address);

export class Contract {
  private static _instance: Contract = new Contract();

  // private _wallet: WalletContextState | null = null;
  private _connection: Connection | null = null;
  private _program: Program<Todo> | null = null;

  constructor() {
    if (Contract._instance) {
      throw new Error(
        "Error: Instantiation failed: Use SingletonClass.getInstance() instead of new."
      );
    }
    Contract._instance = this;
  }

  public static getInstance(): Contract {
    return Contract._instance;
  }

  private initProgram(connection: Connection) {
    logger.info("Contract initProgram");
    const provider = new Provider(
      connection,
      (window as any).solana,
      Provider.defaultOptions()
    );
    const program = new Program(
      idl as any,
      PROGRAM_ID,
      provider
    ) as Program<Todo>;
    this._program = program;
  }

  // public setWallet(wallet: WalletContextState) {
  //   this._wallet = wallet;
  // }

  public setConnection(conn: Connection) {
    this._connection = conn;
    this.initProgram(conn);
  }

  /**
   * 获取用户有效的 NFT
   * @param owner
   * @returns
   */
  public async getValidNFTokensWithOwner(
    owner: PublicKey
  ): Promise<NFTDataItem[]> {
    if (!this._connection) {
      return [];
    }
    const tokens = await this._connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    });

    // initial filter - only tokens with 0 decimals & of which 1 is present in the wallet
    const filteredToken = tokens.value
      .filter((t) => {
        const amount = t.account.data.parsed.info.tokenAmount;
        return amount.decimals === 0 && amount.uiAmount === 1;
      })
      .map((t) => ({
        address: t.pubkey,
        mint: t.account.data.parsed.info.mint,
      }));
    return filteredToken;
  }

  public async userTodoList(owner: PublicKey) {
    if (!this._connection || !this._program) {
      return null;
    }
    const program = this._program;

    const filter = [
      {
        memcmp: {
          offset: 8,
          bytes: owner.toBase58(),
        },
      },
    ];
    const data = await program.account.todoList.all(filter);
    logger.debug("data", data);
    return data.map((item) => {
      // if (item.account.lines.length > 0) {
      //   item.account.lines.forEach((im) => {
      //     console.log(im.toString());
      //     program.account.listItem.all([
      //       {
      //         memcmp: {
      //           offset: ;
      //         }
      //       }
      //     ])
      //   });
      // }
      return {
        pda: item.publicKey,
        owner: item.account.listOwner,
        name: item.account.name,
        lines: item.account.lines,
      };
    });
  }

  public async createTodoList(
    wallet: WalletContextState,
    name: string,
    capacity = 16
  ): Promise<void> {
    if (!this._connection || !this._program || !wallet.publicKey) {
      log.error("createTodoList not valid");
      return;
    }
    const program = this._program;
    const connection = this._connection;

    const [listAccount, listBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("todolist"),
          wallet.publicKey.toBytes(),
          Buffer.from(name.slice(0, 32)),
        ],
        program.programId
      );
    log.debug(listAccount.toString());
    const initTx = await program.transaction.newList(name, capacity, listBump, {
      accounts: {
        list: listAccount,
        user: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      },
      signers: [],
    });

    const signature = await wallet.sendTransaction(initTx, connection);
    const result = await connection.confirmTransaction(signature, "processed");
    log.debug("createTodoList result:", result);
    return;
  }

  public async addTodoListItem(
    wallet: WalletContextState,
    listName: string,
    listOwner: PublicKey,
    listPDA: PublicKey,
    name: string
  ) {
    if (!this._connection || !this._program || !wallet.publicKey) {
      log.error("createTodoList not valid");
      return;
    }
    log.debug({ listName, listOwner, listPDA, name });
    const bounty = 0.1 * web3.LAMPORTS_PER_SOL;
    const program = this._program;
    const connection = this._connection;

    const [listItemAccount, listBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("todolistitem"),
          listOwner.toBytes(),
          wallet.publicKey.toBytes(),
          Buffer.from(name.slice(0, 32)),
        ],
        program.programId
      );
    console.log(listItemAccount.toBuffer(), listOwner.toBuffer(), listBump);
    const initTx = await program.transaction.add(
      listName,
      name,
      new BN(bounty),
      {
        accounts: {
          list: listPDA,
          listOwner: listOwner,
          item: listItemAccount,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [],
      }
    );

    const signature = await wallet.sendTransaction(initTx, connection);
    const result = await connection.confirmTransaction(signature, "processed");
    log.debug("createTodoList result:", result);
    return;
  }

  // public async getAccountInfo() {
  //   if (!this._connection) {
  //     log.error("getAccountInfo not valid");
  //     return;
  //   }
  //   const itemPDA = new PublicKey(
  //     "7ZjDNu8fwxhHNoQQHXVMV3wnjZYAt8aAg5D4Y7VxeUA9"
  //   );
  //   const info = await this._connection.getAccountInfo(itemPDA);

  //   log.info({ info: info, data: info?.data });
  // }

  public async getAccountInfo() {
    if (!this._program) {
      log.error("getAccountInfo not valid");
      return;
    }
    const itemPDA = new PublicKey(
      "7ZjDNu8fwxhHNoQQHXVMV3wnjZYAt8aAg5D4Y7VxeUA9"
    );
    const info = await this._program.account.listItem.fetch(itemPDA);

    log.info({ info: info });
  }
}
