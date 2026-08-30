# Send Gate demo sandbox

## Open it

Use [`/demo`](/demo), or choose **Try it with sample data** on the first
screen. The demo loads three realistic link-based approval gates:

- Harbour House — kitchen quote, awaiting Avery Chen’s review
- Mason & Alder — July invoice, still in draft
- Cedar Lane — repair quote, already approved and ready for its email handoff

The first screen after opening the demo is the populated approval desk.

## Isolation and reset

Demo records live only in IndexedDB database `demo:send-gate-local`. Its local
encryption key and license cache use `demo:`-prefixed localStorage keys. The
normal desk uses `send-gate-local` and never reads or writes the demo namespace.

The persistent **Demo — sample data, nothing is saved** banner provides:

- **Reset demo** — replaces demo records with the shipped three-gate sample.
- **Start for real** — leaves `/demo` for an empty normal desk. Demo records
  remain isolated and are not copied to real storage.

The service worker precaches `/demo/`, so the sample approval flow can be used
after the first visit while offline. Claim tests run only from this entry point;
see [`claims.json`](claims.json).
