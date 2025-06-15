import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET as string; 

let version = 0;

export function createConfigJWT(configData: Record<string, any>): string {
  version = version + 1;
  const token = jwt.sign({ ...configData, tokenVersion: version }, JWT_SECRET, { expiresIn: "1d" });
  return token;
}

export function getTokenVersion() {
  return version;
}

export function verifyConfigJWT(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>;
  } catch (e) {
    console.error("Invalid or expired JWT", e);
    return null;
  }
}


