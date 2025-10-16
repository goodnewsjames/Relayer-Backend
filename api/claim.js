import { ethers } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  try {
    const { address } = req.body;
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ success: false, message: "Invalid address" });
    }

    // Load environment variables
    const {
      PRIVATE_KEY,
      TOKEN_ADDRESS,
      RPC_URL,
      TOKEN_DECIMALS,
      AMOUNT
    } = process.env;

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // ABI for ERC20 Transfer
    const ERC20_ABI = [
      "function transfer(address to, uint256 value) public returns (bool)"
    ];

    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);
    const amountToSend = ethers.parseUnits(AMOUNT, TOKEN_DECIMALS);

    console.log(`Sending ${AMOUNT} tokens to ${address}...`);

    const tx = await token.transfer(address, amountToSend);
    await tx.wait();

    console.log(`✅ Sent: ${tx.hash}`);

    return res.status(200).json({
      success: true,
      message: "Tokens sent successfully",
      txHash: tx.hash,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
