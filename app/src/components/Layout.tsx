import { Outlet } from "react-router-dom";
import { Container } from "react-bootstrap";

import { NavHeader } from "./Nav";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export default function Layout({
  network,
  setNetwork,
}: {
  network: WalletAdapterNetwork;
  setNetwork: Function;
}) {
  return (
    <>
      <NavHeader {...{ network, setNetwork }} />

      <Container>
        <Outlet />
      </Container>
    </>
  );
}
