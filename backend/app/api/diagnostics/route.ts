import { hasDatabaseConfig } from "@/lib/data/server-adapter";

export async function GET() {
  return Response.json({
    ai: Boolean(process.env.GEMINI_API_KEY),
    database: hasDatabaseConfig(),
  });
}
