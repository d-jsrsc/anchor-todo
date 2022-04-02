import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Link } from "react-router-dom";
import { Container, Form, Nav, Navbar } from "react-bootstrap";

export function NavHeader({
  network,
  setNetwork,
}: {
  network: WalletAdapterNetwork;
  setNetwork: Function;
}) {
  return (
    <Navbar collapseOnSelect expand="lg" bg="light">
      <Container>
        <Navbar.Brand href="#home">React-Bootstrap</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              Home
            </Nav.Link>
            <Nav.Link as={Link} to="/gallery">
              gallery
            </Nav.Link>
            <Nav.Link as={Link} to="/test">
              test
            </Nav.Link>
          </Nav>
          <Nav>
            <WalletMultiButton
              style={{
                width: "150px",
              }}
            />
            <Form.Select
              aria-label="Select Network"
              value={network}
              onChange={(e) => {
                setNetwork(e.target.value);
              }}
            >
              <option value={WalletAdapterNetwork.Mainnet}>
                {WalletAdapterNetwork.Mainnet}
              </option>
              <option value={WalletAdapterNetwork.Testnet}>
                {WalletAdapterNetwork.Testnet}
              </option>
              <option value={WalletAdapterNetwork.Devnet}>
                {WalletAdapterNetwork.Devnet}
              </option>
            </Form.Select>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
