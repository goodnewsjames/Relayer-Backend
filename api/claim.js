import { ethers } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  try {
    const { address } = req.body;
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }

    // Load environment variables
    const {
      PRIVATE_KEY,
      CONTRACT_ADDRESS,
      RPC_URL
    } = process.env;

    if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
      return res.status(500).json({ success: false, message: "Missing environment variables" });
    }

    // Connect to provider and wallet (this wallet will pay gas)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Your contract ABI (must include claim(address))
    const CONTRACT_ABI = [
      "function claim(address recipient) external"
    ];

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    console.log(`Calling claim(${address})...`);

    // Call the claim function and wait for confirmation
    const tx = await contract.claim(address);
    await tx.wait();

    console.log(`✅ Claim successful: ${tx.hash}`);

    return res.status(200).json({
      success: true,
      message: `Claim successful for ${address}`,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
