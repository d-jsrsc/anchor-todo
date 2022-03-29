import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import log from "loglevel";

import { useContract, NFTDataItem } from "../contract";

const logger = log.getLogger("Home");
export default function Home() {
  const contract = useContract();
  const wallet = useWallet();
  const [nftData, setNFTData] = useState<any[]>([]);

  useEffect(() => {
    const pubKey = wallet.publicKey;
    if (!pubKey) {
      setNFTData([]);
      return;
    }
    let alive = true;
    (async () => {
      const info = await contract.instance.getAccountInfo();

      console.log("---------------------", info);
      const data = await contract.instance.userTodoList(pubKey);
      logger.debug(data);
      data && alive && setNFTData(data);
    })();
    return () => {
      alive = false;
    };
  }, [contract, wallet.publicKey]);

  const createTodoList = useCallback(() => {
    (async () => {
      await contract.instance.createTodoList(wallet, "test2");
    })();
  }, [contract, wallet]);

  const createTodoListItem = useCallback(
    (listName, listOwner, listPDA) => {
      (async () => {
        await contract.instance.addTodoListItem(
          wallet,
          listName,
          listOwner,
          listPDA,
          listName + "-item"
        );
      })();
    },
    [contract, wallet]
  );

  return (
    <div>
      <ul>
        {nftData.map((item) => {
          log.info({ item });
          return (
            <div key={item.pda.toString()}>
              <li>
                <Link to="/img/1">{`${item.pda.toString()}-${item.name}`}</Link>
              </li>
              <button
                onClick={() =>
                  createTodoListItem(item.name, item.owner, item.pda)
                }
              >
                createItem
              </button>
            </div>
          );
        })}
      </ul>
      <button onClick={createTodoList}>create a todo list</button>
    </div>
  );
}
