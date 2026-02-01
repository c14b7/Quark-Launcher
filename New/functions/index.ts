/**
 * Quark Launcher - Appwrite Functions Entry Point
 * 
 * This is the main entry point for all Appwrite Functions.
 */

import { handleSteamApiRequest } from './steam-api';

export default async function(req: any, res: any) {
  const path = req.path || '';

  // Route requests to appropriate handlers
  if (path.startsWith('/steam')) {
    return handleSteamApiRequest(req, res);
  }

  // Default response
  return res.json({
    success: true,
    message: 'Quark Launcher API',
    version: '1.0.0',
    endpoints: [
      '/steam - Steam API integration',
    ],
  });
}
