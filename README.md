# がんばれひよこ

Ganbare Hiyoko (がんばれひよこ) means "Do your best, Chick" in Japanese.

## Quick Start

### Prerequisites

- Node.js v18.0.0
- npm v8.0.0
- Create `wallets.json` file on this directory, you can use the following template:

```json
// wallets.json
[
  {
    "address": "0x1234567890123456789012345678901234567890",
    "privateKey": "0x1234567890123456789012345678901234567890123456789012345678901234"
  }
]
```

### Steps

1. Install the dependencies

```bash
npm install
```

2. Run the following command to start the program

```bash
npm start -- --goal "vote-on-ruby 57 0.23"
```

## Vote on Ruby - Options

1. `Arg 1`: The total number of votes (trx)
2. `Arg 2`: Gas price in Gwei

```bash
./ganbare-hiyoko \
  --goal "vote-on-ruby 100 0.2" \
                      # |   |__ Gas price in Gwei
                      # |______ The total number of votes (trx)
  --wallets "./wallets.json"
```

## The Goal

```bash
$ ./ganbare-hiyoko \
    --goal "vote-on-ruby 100 0.2" \
    --wallets "./wallets.json"

$ Output:
$ 1. EVM Address: 0x1234567890abcdef
$ [....................] 0.00% (0/100)
$ 2. EVM Address: 0xabcdef1234567890
$ [....................] 0.00% (0/100)
$ ...
$ Report:
$ | EVM Address         | Goal Status     | Failed Reason        |
$ |---------------------|-----------------|----------------------|
$ | 0x1234567890abcdef  | ✅              |                      |
$ | 0xabcdef1234567890  | 92 trx to go    | Insufficient balance |
$ ...
$
```

### `wallets.json`

```json
[
  {
    "address": "0x1234567890123456789012345678901234567890",
    "privateKey": "0x1234567890123456789012345678901234567890123456789012345678901234"
  },
  {
    "address": "0x1234567890123456789012345678901234567891",
    "privateKey": "0x1234567890123456789012345678901234567890123456789012345678901235"
  }
]
```

### Options

- `--goal` (required): The goal to achieve. The format is "<path_to_goal> <arg_1> <arg_2> ... <arg_n>".

- `--private-keys` (optional): The private keys to use. The format is a JSON file containing an array of private keys.
