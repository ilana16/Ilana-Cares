import type { Express } from 'express';
import { getAuthUrl, getTokensFromCode } from './calendar';

export function registerGoogleAuthRoutes(app: Express) {
  // Route to initiate OAuth flow
  app.get('/api/google/auth', (_req, res) => {
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
  });

  // OAuth callback route
  app.get('/api/google/callback', async (req, res) => {
    const code = req.query.code as string;

    if (!code) {
      return res.status(400).send('Authorization code not found');
    }

    try {
      const tokens = await getTokensFromCode(code);
      
      // Display tokens to user for configuration
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Calendar Authorization Success</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              h1 { color: #4CAF50; }
              .token-box {
                background: #f9f9f9;
                border: 1px solid #ddd;
                padding: 15px;
                margin: 15px 0;
                border-radius: 4px;
                word-break: break-all;
                font-family: monospace;
                font-size: 12px;
              }
              .label {
                font-weight: bold;
                color: #333;
                margin-top: 15px;
              }
              .warning {
                background: #fff3cd;
                border: 1px solid #ffc107;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Authorization Successful!</h1>
              <p>Your Google Calendar has been authorized. Please add the following environment variable to your deployment:</p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> Keep this refresh token secure! It provides access to your calendar.
              </div>
              
              <div class="label">GOOGLE_REFRESH_TOKEN:</div>
              <div class="token-box">${tokens.refresh_token || 'Not provided - you may need to revoke access and try again'}</div>
              
              <div class="label">Access Token (for testing):</div>
              <div class="token-box">${tokens.access_token}</div>
              
              <h3>Next Steps:</h3>
              <ol>
                <li>Copy the GOOGLE_REFRESH_TOKEN value above</li>
                <li>Add it to your Railway environment variables:
                  <ul>
                    <li>Go to your Railway project</li>
                    <li>Click on your service → Variables</li>
                    <li>Add: <code>GOOGLE_REFRESH_TOKEN</code> = (paste the token)</li>
                  </ul>
                </li>
                <li>Redeploy your application</li>
                <li>The calendar integration will now work automatically!</li>
              </ol>
              
              <p><a href="/">← Return to Home</a></p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      res.status(500).send('Failed to authorize. Please try again.');
    }
  });
}

