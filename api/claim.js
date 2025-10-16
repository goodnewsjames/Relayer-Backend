import { ethers } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  try {
    const { wallet } = req.body; // notice: wallet instead of address (to match your frontend)
    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ success: false, message: "Invalid address format." });
    }

    const { PRIVATE_KEY, TOKEN_ADDRESS, RPC_URL, TOKEN_DECIMALS, AMOUNT } = process.env;
    if (!PRIVATE_KEY || !TOKEN_ADDRESS || !RPC_URL || !TOKEN_DECIMALS || !AMOUNT) {
      return res.status(500).json({
        success: false,
        message: "Missing environment variables. Check your .env setup.",
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const walletSigner = new ethers.Wallet(PRIVATE_KEY, provider);

    const ERC20_ABI = [
      "function transfer(address to, uint256 value) public returns (bool)"
    ];
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, walletSigner);
    const amountToSend = ethers.parseUnits(AMOUNT, TOKEN_DECIMALS);

    console.log(`🚀 Sending ${AMOUNT} tokens to ${wallet}...`);

    const tx = await token.transfer(wallet, amountToSend);
    console.log(`⏳ Waiting for tx confirmation: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Sent successfully: ${receipt.transactionHash}`);

    return res.status(200).json({
      success: true,
      message: `Tokens sent successfully to ${wallet}`,
      txHash: receipt.transactionHash,
    });

  } catch (err) {
    console.error("❌ Relayer Error:", err);

    // Extract deeper error info (ethers v6 style)
    const detailedError = {
      message: err.message,
      reason: err.reason || null,
      code: err.code || null,
      data: err.data || null,
      short: err.shortMessage || null,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };

    return res.status(500).json({
      success: false,
      message: "Airdrop failed. See error details.",
      error: detailedError,
    });
  }
}
