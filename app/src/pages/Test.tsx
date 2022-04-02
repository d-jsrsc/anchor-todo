import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@project-serum/anchor";
import { useCallback, useEffect, useState } from "react";
import log from "loglevel";
import {
  PublicKey,
  Connection,
  AccountInfo,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import { useContract } from "../contract";
import { getAccount } from "@solana/spl-token";

const logger = log.getLogger("Test");

export default function Test() {
  const contract = useContract();
  const wallet = useWallet();
  const { connection } = useConnection();

  const transferNFT = useCallback(async () => {
    const mint = new web3.PublicKey(
      "GXebK2oeTrAj5KmV46Th4nsnuqZpyYUcVNu7vptKWpc6"
    );
    const receiver = new web3.PublicKey(
      //   "3112ASdPyfQFAvoyatxRdUrhe6MwN3TrWzxiBia6UdqA"
      "3VBhW51tUBzZfWpSv5fcZww3sMtcPoYq55k38rWPFsvi"
    );

    let tokenAccount = await getAccount(
      connection,
      new web3.PublicKey("F23BjZrLtbWZ7czy9h2a22X7RUcips4XRPjfekqDGTGx")
    );
    console.log(tokenAccount);

    const info = await connection.getAccountInfo(
      new web3.PublicKey("C9DRkC4RpC88dMaZWqyh2cGKZJc1bTTE88cpcK6ZBC17")
    );
    console.log({ info }, info?.owner.toString());

    // await contract.instance.transferNFTToOther(mint, receiver, wallet);
  }, [contract, wallet, connection]);

  return (
    <div>
      <button onClick={transferNFT}>create a todo list</button>
    </div>
  );
}
