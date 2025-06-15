import type { NextApiRequest, NextApiResponse } from "next";
import { createConfigJWT } from "@/features/externalAPI/jwt";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { config } = req.body;
  if (!config || typeof config !== "object") {
    return res.status(400).json({ error: "Invalid config data" });
  }

  try {
    const token = createConfigJWT(config); 
    res.status(200).json({ token });
  } catch (e) {
    console.error("JWT signing error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
}
