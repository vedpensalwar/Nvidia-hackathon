export interface ServerConfig {
  nebiusApiKey: string;
  nebiusBaseUrl: string;
  nebiusModelId: string;
  tavilyApiKey: string;
}

export function getServerConfig(): ServerConfig {
  const nebiusApiKey = process.env.NEBIUS_API_KEY || '';
  let nebiusBaseUrl =
    process.env.NEBIUS_BASE_URL ||
    'https://api.tokenfactory.eu-north1.nebius.com/v1/';
  
  // Ensure trailing slash for OpenAI SDK / fetch compatibility
  if (!nebiusBaseUrl.endsWith('/')) {
    nebiusBaseUrl += '/';
  }

  const nebiusModelId =
    process.env.NEBIUS_MODEL_ID || 'nvidia/Nemotron-3_5-Lightning';

  const tavilyApiKey = process.env.TAVILY_API_KEY || '';

  return {
    nebiusApiKey,
    nebiusBaseUrl,
    nebiusModelId,
    tavilyApiKey,
  };
}

export interface ConfigDiagnostic {
  isReady: boolean;
  missingVariables: string[];
  instructions: string[];
}

export function checkServerCredentials(): ConfigDiagnostic {
  const config = getServerConfig();
  const missing: string[] = [];

  if (!config.nebiusApiKey || config.nebiusApiKey.trim() === '') {
    missing.push('NEBIUS_API_KEY');
  }

  if (!config.tavilyApiKey || config.tavilyApiKey.trim() === '') {
    missing.push('TAVILY_API_KEY');
  }

  const instructions: string[] = [];
  if (missing.includes('NEBIUS_API_KEY')) {
    instructions.push(
      'Set NEBIUS_API_KEY in .env.local (obtain from Nebius Token Factory console for nvidia/Nemotron-3_5-Lightning).'
    );
  }
  if (missing.includes('TAVILY_API_KEY')) {
    instructions.push(
      'Set TAVILY_API_KEY in .env.local (obtain from tavily.com for AI search retrieval).'
    );
  }

  return {
    isReady: missing.length === 0,
    missingVariables: missing,
    instructions,
  };
}
