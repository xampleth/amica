import type { NextApiRequest, NextApiResponse } from 'next';
import { MemoryData, readStore, updateStore, writeStore } from '@/features/externalAPI/memoryStore';
import { write } from 'fs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type } = req.query;

  if (!['config', 'subconscious', 'logs', 'userInputMessages', 'chatLogs'].includes(type as string)) {
    return res.status(400).json({ error: 'Invalid type parameter' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetRequest(type as keyof MemoryData, res);
      case 'POST':
        return handlePostRequest(type as keyof MemoryData, req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.error });
  }
}

const handleGetRequest = (type: keyof MemoryData, res: NextApiResponse) => {
    let data;
    if (["config","subconscious","logs","userInputMessages","chatLogs"].includes(type)) {
      data = readStore(type);
      res.status(200).json(data);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
  };
  
  const handlePostRequest = (type: keyof MemoryData, req: NextApiRequest, res: NextApiResponse) => {
    const { body } = req;
    let response;

    if (["config","subconscious","logs","userInputMessages","chatLogs"].includes(type)) {
      response = writeStore(type,body);
      res.status(200).json(response);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
  
    res.status(200).json(response);
  };