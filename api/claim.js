import { ethers } from "ethers";

export default async function handler(req, res) {
  // --- Enable CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*"); // allow all origins
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    const msg = "Only POST allowed";
    console.log("❌", msg);
    return res.status(405).json({ success: false, message: msg });
  }

  try {
    const { wallet } = req.body; // matches frontend
    if (!wallet || !ethers.isAddress(wallet)) {
      const msg = "Invalid address format.";
      console.log("❌", msg, wallet);
      return res.status(400).json({ success: false, message: msg });
    }

    const { PRIVATE_KEY, TOKEN_ADDRESS, RPC_URL, TOKEN_DECIMALS, AMOUNT } = process.env;
    if (!PRIVATE_KEY || !TOKEN_ADDRESS || !RPC_URL || !TOKEN_DECIMALS || !AMOUNT) {
      const msg = "Missing environment variables. Check your .env setup.";
      console.log("❌", msg);
      return res.status(500).json({ success: false, message: msg });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const walletSigner = new ethers.Wallet(PRIVATE_KEY, provider);

    const balance = await provider.getBalance(walletSigner.address);
    console.log("Relayer wallet:", walletSigner.address, "Balance:", ethers.formatEther(balance), "AVAX");

    const ERC20_ABI = ["function transfer(address to, uint256 value) public returns (bool)"];
    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, walletSigner);

    const amountToSend = ethers.parseUnits(AMOUNT, Number(TOKEN_DECIMALS));

    console.log(`🚀 Sending ${AMOUNT} tokens to ${wallet}...`);

    const tx = await token.transfer(wallet, amountToSend);
    console.log(`⏳ Waiting for tx confirmation: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Sent successfully: ${receipt.transactionHash}`);

    const successResponse = {
      success: true,
      message: `Tokens sent successfully to ${wallet}`,
      txHash: receipt.transactionHash,
    };

    // Propagate response to frontend
    return res.status(200).json(successResponse);

  } catch (err) {
    // Prepare detailed error
    const detailedError = {
      message: err.message,
      reason: err.reason || null,
      code: err.code || null,
      data: err.data || null,
      short: err.shortMessage || null,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };

    console.error("❌ Relayer Error:", detailedError);

    // Send error response to frontend
    return res.status(500).json({
      success: false,
      message: "Airdrop failed. See error details.",
      error: detailedError,
    });
  }
}
