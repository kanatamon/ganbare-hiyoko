# がんばれひよこ

Ganbare Hiyoko (がんばれひよこ) means "Do your best, Chick" in Japanese.

## The Goal

```bash
$ ./ganbare-hiyoko \
    --goal "./goal/vote-on-ruby.ts 100 0.2" \
    --private-keys "./private-keys.json"

$ Output:
$ 1. EVM Address: 0x1234567890abcdef
$ [....................] 0.00% (0/100)
$ 2. EVM Address: 0xabcdef1234567890
$ [....................] 0.00% (0/100)
$ ...
$ Report:
$ | EVM Address         | Total TRX to do | Failed Reason        |
$ |---------------------|-----------------|----------------------|
$ | 0x1234567890abcdef  | ✅              |                      |
$ | 0xabcdef1234567890  | 92              | Insufficient balance |
$ ...
$
```

### Options

- `--goal` (required): The goal to achieve. The format is "<path_to_goal> <arg_1> <arg_2> ... <arg_n>".

- `--private-keys` (required): The private keys to use. The format is a JSON file containing an array of private keys.
