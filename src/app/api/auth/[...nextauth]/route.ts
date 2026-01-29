import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const handler = NextAuth(authOptions as any);
  return handler(request as any);
}

export async function POST(request: Request) {
  const handler = NextAuth(authOptions as any);
  return handler(request as any);
}
