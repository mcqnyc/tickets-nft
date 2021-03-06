import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

Clarinet.test({
  name: "user can pay for a token using claim function",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const recipient = accounts.get("wallet_1")!;
    const nftPrice = 100;
    const mintedNftId = "u1";

    const block = chain.mineBlock([
      Tx.contractCall("tickets-nft", "claim", [], recipient.address),
    ]);
    // The claim should be successful.
    block.receipts[0].result.expectOk().expectBool(true);
    // There should be a new NFT minted with a value of "u1".
    assertEquals(block.receipts[0].events[1].nft_mint_event.value, mintedNftId);
    // There should be a STX transfer of the nftPrice specified.
    block.receipts[0].events.expectSTXTransferEvent(
      nftPrice,
      recipient.address,
      `${deployer.address}.tickets-nft`
    );
  },
});

Clarinet.test({
  name: "user can't get a token after the block-height has been reached",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const recipient = accounts.get("wallet_1")!;
    const unlockHeight = 10;
    chain.mineBlock([
      Tx.contractCall("tickets-nft", "claim", [], recipient.address),
    ]);

    // Advance the chain until the use-by block-height reached.
    chain.mineEmptyBlockUntil(unlockHeight);

    const block = chain.mineBlock([
      Tx.contractCall("tickets-nft", "claim", [], recipient.address),
    ]);
    // Should return err-use-by-block-reached (err u102).
    block.receipts[0].result.expectErr().expectUint(102);
    assertEquals(block.receipts[0].events.length, 0);
  },
});

Clarinet.test({
  name: "owner can withdraw STX from contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const nftPrice = 100;
    const unlockHeight = 10;
    const recipient = accounts.get("wallet_1")!;

    chain.mineBlock([
      Tx.contractCall("tickets-nft", "claim", [], recipient.address),
    ]);
    // Advance the chain until the use-by block-height reached.
    chain.mineEmptyBlockUntil(unlockHeight);

    const block = chain.mineBlock([
      Tx.contractCall("tickets-nft", "withdraw-stx", [], deployer.address),
    ]);

    // The withdrawal should be successful.
    block.receipts[0].result.expectOk().expectBool(true);

    // There should be a STX transfer of the nftPrice specified.
    block.receipts[0].events.expectSTXTransferEvent(
      nftPrice,
      `${deployer.address}.tickets-nft`,
      deployer.address
    );
  },
});

Clarinet.test({
  name: "no non-owner user can withdraw STX from contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const unlockHeight = 10;
    const recipient = accounts.get("wallet_1")!;

    chain.mineBlock([
      Tx.contractCall("tickets-nft", "claim", [], recipient.address),
    ]);
    // Advance the chain until the use-by block-height reached.
    chain.mineEmptyBlockUntil(unlockHeight);

    const block = chain.mineBlock([
      Tx.contractCall("tickets-nft", "withdraw-stx", [], recipient.address),
    ]);

    // The withdrawal should fail.
    block.receipts[0].result.expectErr().expectUint(107);
    assertEquals(block.receipts[0].events.length, 0);
  },
});
