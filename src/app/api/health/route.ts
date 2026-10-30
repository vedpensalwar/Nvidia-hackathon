import { NextResponse } from 'next/server';
import { getServerConfig, checkServerCredentials } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getServerConfig();
  const credentials = checkServerCredentials();

  const nebiusConfigured = Boolean(config.nebiusApiKey && config.nebiusApiKey.length > 5);
  const tavilyConfigured = Boolean(config.tavilyApiKey && config.tavilyApiKey.length > 5);

  return NextResponse.json({
    status: credentials.isReady ? 'READY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    nebius: {
      configured: nebiusConfigured,
      baseUrl: config.nebiusBaseUrl,
      modelId: config.nebiusModelId,
    },
    tavily: {
      configured: tavilyConfigured,
    },
    system: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    },
    missingVariables: credentials.missingVariables,
    instructions: credentials.instructions,
  });
}
