import { NextApiRequest, NextApiResponse } from "next";

import { TimestampedPrompt } from "@/features/amicaLife/eventHandler";
import { config as configs } from "@/utils/config";
import { apiLogs } from "./amicaHandler";
import { getTokenVersion } from "@/features/externalAPI/jwt"

import {
  ApiResponse,
  generateSessionId,
  sendError,
} from "@/features/externalAPI/utils/apiHelper";
import { transcribeVoice } from "@/features/externalAPI/processors/voiceProcessor";
import { processImage } from "@/features/externalAPI/processors/imageProcessor";

import formidable from "formidable";
import fs from "fs";
import { WaveFile } from "wavefile";
import { writeStore } from "@/features/externalAPI/memoryStore";
import { verifyConfigJWT } from "@/features/externalAPI/jwt";

// Configure body parsing: disable only for multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET as string;

// Main API handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  // Syncing config to be accessible from server side
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET is not defined" });
  }
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  let decoded;
  try {
    decoded = verifyConfigJWT(token);
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
  const latestTokenVersion = getTokenVersion();
  if (decoded?.tokenVersion !== latestTokenVersion) {
    return res.status(401).json({ error: "JWT token version is outdat" });;
  }
  const configFromToken = decoded;

  // Apply the config globally for the request
  writeStore("config", configFromToken!);

  if (configs("external_api_enabled") !== "true") {
    return sendError(res, "", "API is currently disabled.", 503);
  }

  const currentSessionId = generateSessionId();
  const timestamp = new Date().toISOString();

  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    // Handle form-data
    const form = formidable({});
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return sendError(res, currentSessionId, "Failed to parse form data.");
      }

      try {
        await handleRequest(currentSessionId, timestamp, fields, files, res);
      } catch (error) {
        console.error("Error in form processing:", error);
        sendError(res, currentSessionId, String(error), 500);
      }
    });
  } else {
    return sendError(res, currentSessionId, "Incorrect type");
  }
}

async function handleRequest(
  sessionId: string,
  timestamp: string,
  fields: any,
  files: any,
  res: NextApiResponse<ApiResponse>,
) {
  let response: string | undefined | TimestampedPrompt[];
  let outputType: string | undefined;

  const inputType = fields?.inputType?.[0] || null;
  const payload = files?.payload?.[0] || null;

  if (!inputType) {
    throw new Error("Missing or invalid inputType field.");
  }

  if (!payload) {
    throw new Error("Payload file is missing.");
  }

  try {
    switch (inputType) {
      case "Voice":
        if (payload) {
          const filePath = payload.filepath;
          const fileBuffer = fs.readFileSync(filePath);
          const wav = new WaveFile();
          wav.fromScratch(1, 16000, "32f", fileBuffer);
          wav.toBitDepth("16");
          const audioFile = new File(
            [new Uint8Array(wav.toBuffer())],
            "input.wav",
            { type: "audio/wav" },
          );
          response = await transcribeVoice(audioFile);
          outputType = "Text";
        } else {
          throw new Error("Voice input file missing.");
        }
        break;

      case "Image":
        if (payload) {
          const imageBuffer = fs.readFileSync(payload.filepath);
          response = await processImage(imageBuffer);
          outputType = "Text";
        } else {
          throw new Error("Image input file missing.");
        }
        break;

      default:
        return sendError(res, sessionId, "Unknown input type.");
    }

    apiLogs.push({
      sessionId: sessionId,
      timestamp,
      inputType,
      outputType,
      response,
    });
    res.status(200).json({ sessionId, outputType, response });
  } catch (error) {
    apiLogs.push({
      sessionId: sessionId,
      timestamp,
      inputType,
      outputType: "Error",
      error: String(error),
    });
    sendError(res, sessionId, String(error), 500);
  }
}
