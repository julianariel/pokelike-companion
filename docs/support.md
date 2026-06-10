# Support Setup

## Recommendation

Use external support links instead of processing payments inside the extension.

Best stack:

1. **Cafecito** as the friendly creator-support page for Argentina and LatAm.
2. **Mercado Pago** payment link or subscription for supporters who prefer a direct local payment flow.
3. **Crypto** as an advanced fallback using `julianariel.eth` for EVM-compatible chains.

This keeps the extension simple, avoids payment permissions, and lets each platform handle receipts, fraud, chargebacks, and supporter UX.

## Why These Rails

- Cafecito describes itself as a crowdfunding platform for creators, NGOs, and projects.
- Mercado Pago supports no-code payment links and subscription plans, including recurring payments where supporters can choose an amount.
- ENS supports EVM-compatible chain address records, but wallet support and chain-specific resolution can vary.

## Crypto Safety

`julianariel.eth` is reasonable as an optional crypto donation target if the ENS resolver is configured correctly.

Rules for public docs:

- Say **EVM-compatible chains only**.
- Publish `julianariel.eth` and, when ready, the resolved `0x...` address for verification.
- Tell supporters to send a small test transaction first.
- Do not ask supporters to connect a wallet to the extension.
- Do not ask for seed phrases, private keys, exchange logins, or screenshots of wallets.
- Do not imply that non-EVM assets are safe to send to an EVM address.

## README Rollout Checklist

Before replacing the current support copy with live buttons:

- Create or confirm the Cafecito profile URL.
- Create or confirm the Mercado Pago payment link URL.
- Verify `julianariel.eth` resolution from at least two wallets.
- Decide whether to publish the resolved `0x...` address beside the ENS name.
- Add the live URLs to the README and, optionally, `.github/FUNDING.yml`.

## Future Options

- GitHub Sponsors if the project gains broader open-source usage.
- Ko-fi or Buy Me a Coffee for international card/PayPal-style support.
- A project website with a simple Support page once the extension has a landing page.
