import React, { createContext, useContext, useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";

import { Contract } from "./Instance";
import log from "loglevel";

const logger = log.getLogger("ContractProvider");
const instance = Contract.getInstance();

export interface ContextData {
  instance: Contract;
}

export const contextDefaultValue: ContextData = {
  instance,
};
export const ContractContext = createContext<ContextData>(contextDefaultValue);

export const useContract = () => useContext(ContractContext);

type Props = {
  children: React.ReactNode;
};

export const Provider = ({ children }: Props) => {
  const { connection } = useConnection();

  const memoizedValue = useMemo(() => {
    logger.debug("contract set connection");
    instance.setConnection(connection);
    return { instance };
  }, [connection]);

  return (
    <ContractContext.Provider value={memoizedValue}>
      {children}
    </ContractContext.Provider>
  );
};
