/**
 * Integration status checks for Settings page
 * Verifies connectivity without exposing API keys
 */

export type IntegrationStatus = "connected" | "error" | "not_configured";

export interface IntegrationInfo {
  name: string;
  status: IntegrationStatus;
  description: string;
  lastChecked: string;
  errorMessage?: string;
}

/**
 * Check OpenAI API connection
 */
async function checkOpenAI(): Promise<IntegrationInfo> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      name: "OpenAI",
      status: "not_configured",
      description: "AI-powered task analysis and suggestions",
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return {
        name: "OpenAI",
        status: "connected",
        description: "AI-powered task analysis and suggestions",
        lastChecked: new Date().toISOString(),
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        name: "OpenAI",
        status: "error",
        description: "AI-powered task analysis and suggestions",
        lastChecked: new Date().toISOString(),
        errorMessage: errorData.error?.message || `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: "OpenAI",
      status: "error",
      description: "AI-powered task analysis and suggestions",
      lastChecked: new Date().toISOString(),
      errorMessage: error.message || "Connection failed",
    };
  }
}

/**
 * Check Google Calendar OAuth credentials
 */
async function checkGoogleCalendar(): Promise<IntegrationInfo> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      name: "Google Calendar",
      status: "not_configured",
      description: "Calendar sync and meeting management",
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    // Try to refresh the access token to verify credentials
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (response.ok) {
      return {
        name: "Google Calendar",
        status: "connected",
        description: "Calendar sync and meeting management",
        lastChecked: new Date().toISOString(),
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        name: "Google Calendar",
        status: "error",
        description: "Calendar sync and meeting management",
        lastChecked: new Date().toISOString(),
        errorMessage: errorData.error_description || `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: "Google Calendar",
      status: "error",
      description: "Calendar sync and meeting management",
      lastChecked: new Date().toISOString(),
      errorMessage: error.message || "Connection failed",
    };
  }
}

/**
 * Check Gmail OAuth credentials
 */
async function checkGmail(): Promise<IntegrationInfo> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      name: "Gmail",
      status: "not_configured",
      description: "Email integration and inbox management",
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    // Try to refresh the access token to verify credentials
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (response.ok) {
      return {
        name: "Gmail",
        status: "connected",
        description: "Email integration and inbox management",
        lastChecked: new Date().toISOString(),
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        name: "Gmail",
        status: "error",
        description: "Email integration and inbox management",
        lastChecked: new Date().toISOString(),
        errorMessage: errorData.error_description || `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: "Gmail",
      status: "error",
      description: "Email integration and inbox management",
      lastChecked: new Date().toISOString(),
      errorMessage: error.message || "Connection failed",
    };
  }
}

/**
 * Check Telegram Bot connection
 */
async function checkTelegram(): Promise<IntegrationInfo> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return {
      name: "Telegram",
      status: "not_configured",
      description: "Quick capture and notifications via Telegram bot",
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);

    if (response.ok) {
      const data = await response.json();
      if (data.ok) {
        return {
          name: "Telegram",
          status: "connected",
          description: `Connected as @${data.result.username}`,
          lastChecked: new Date().toISOString(),
        };
      }
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      name: "Telegram",
      status: "error",
      description: "Quick capture and notifications via Telegram bot",
      lastChecked: new Date().toISOString(),
      errorMessage: errorData.description || `HTTP ${response.status}`,
    };
  } catch (error: any) {
    return {
      name: "Telegram",
      status: "error",
      description: "Quick capture and notifications via Telegram bot",
      lastChecked: new Date().toISOString(),
      errorMessage: error.message || "Connection failed",
    };
  }
}

/**
 * Check Notion API connection
 */
async function checkNotion(): Promise<IntegrationInfo> {
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    return {
      name: "Notion",
      status: "not_configured",
      description: "Sync with Notion databases and pages",
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (response.ok) {
      return {
        name: "Notion",
        status: "connected",
        description: "Sync with Notion databases and pages",
        lastChecked: new Date().toISOString(),
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        name: "Notion",
        status: "error",
        description: "Sync with Notion databases and pages",
        lastChecked: new Date().toISOString(),
        errorMessage: errorData.message || `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name: "Notion",
      status: "error",
      description: "Sync with Notion databases and pages",
      lastChecked: new Date().toISOString(),
      errorMessage: error.message || "Connection failed",
    };
  }
}

/**
 * Get status of all integrations
 */
export async function getAllIntegrationStatuses(): Promise<IntegrationInfo[]> {
  const results = await Promise.all([
    checkOpenAI(),
    checkGoogleCalendar(),
    checkGmail(),
    checkTelegram(),
    checkNotion(),
  ]);

  return results;
}

/**
 * Get status of a specific integration
 */
export async function getIntegrationStatus(name: string): Promise<IntegrationInfo | null> {
  const checks: Record<string, () => Promise<IntegrationInfo>> = {
    openai: checkOpenAI,
    "google-calendar": checkGoogleCalendar,
    gmail: checkGmail,
    telegram: checkTelegram,
    notion: checkNotion,
  };

  const checkFn = checks[name.toLowerCase()];
  if (!checkFn) {
    return null;
  }

  return await checkFn();
}
