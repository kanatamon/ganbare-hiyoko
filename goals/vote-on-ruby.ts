import invariant from 'tiny-invariant';
import { ethers } from 'ethers';
import type { GoalFunctionArgs, PrivateKey } from '../src/types';

type NumberOfVotes = string;
type GasInGwei = string;

const RPC_URL = `https://rpc.mainnet.taiko.xyz`;
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

async function voteOnRuby(privateKey: PrivateKey, gasInGwei: GasInGwei) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
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

export default async function voteOnRubyGoal({
  privateKey,
  options,
  callbacks,
}: GoalFunctionArgs<[NumberOfVotes, GasInGwei]>) {
  const [numberOfVotesRaw, gasInGwei] = options;

  const numberOfVotes = Number.parseInt(numberOfVotesRaw);
  invariant(
    !Number.isNaN(numberOfVotes),
    `Invalid number of votes: ${numberOfVotesRaw}`
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
