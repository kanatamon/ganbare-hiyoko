import invariant from 'tiny-invariant';
import { ethers } from 'ethers';
import type { Callbacks, GoalFunctionArgs, PrivateKey } from '../types';
import { RpcProviderRateLimiter, wait } from '../utils';

const CONTRACT_ADDRESS = '0x4D1E2145082d0AB0fDa4a973dC4887C7295e21aB';
const ABI = [
  {
    stateMutability: 'payable',
    type: 'fallback',
  },
  {
    inputs: [],
    name: 'vote',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

const RPC_URL = `https://rpc.mainnet.taiko.xyz`;
const RPC_USAGE_INTERVAL = 3000; // 3 seconds, 20 requests per minute

const rpcProviderRateLimiter = new RpcProviderRateLimiter(
  RPC_URL,
  RPC_USAGE_INTERVAL
);

async function voteOnRuby(privateKey: PrivateKey, gasInGwei: string) {
  const provider = await rpcProviderRateLimiter.getRpcProvider();
  invariant(provider, 'Failed to connect to RPC provider');
  const wallet = new ethers.Wallet(privateKey, provider);
  const cEthContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  invariant(cEthContract.vote, 'vote method not found');

  const amountInWei = ethers.parseEther('0');

  const estimatedGas = await cEthContract.vote.estimateGas({
    value: amountInWei,
  });

  const tx = await cEthContract.vote({
    value: amountInWei,
    gasPrice: ethers.parseUnits(gasInGwei, 'gwei'),
    gasLimit: estimatedGas * BigInt(4),
  });
  const receipt = await tx.wait();
  return receipt;
}

export async function startJobForVoteOnRuby({
  privateKey,
  options,
  callbacks,
}: {
  privateKey: PrivateKey;
  options: {
    numberOfVotes: number;
    gasInGwei: string;
  };
  callbacks?: Callbacks;
}) {
  const { numberOfVotes, gasInGwei } = options;

  invariant(
    !Number.isNaN(numberOfVotes),
    `Invalid number of votes: ${numberOfVotes}`
  );
  invariant(
    !Number.isNaN(Number.parseFloat(gasInGwei)),
    `Invalid gas price: ${gasInGwei}`
  );
  callbacks?.onInit?.(numberOfVotes);

  try {
    for (let i = 0; i < numberOfVotes; i++) {
      await voteOnRuby(privateKey, gasInGwei);
      callbacks?.onProgress?.(i + 1);
    }
    callbacks?.onSuccess?.();
  } catch (error) {
    callbacks?.onFail?.(
      error instanceof Error ? error : new Error(`Unknown error: ${error}`)
    );
  }
}
