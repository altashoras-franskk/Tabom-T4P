// ── Are.na API Integration ───────────────────────────────────────────────────
// https://dev.are.na/documentation
//
// SETUP - Personal Access Token:
// 1. Go to https://dev.are.na/oauth/applications
// 2. Scroll to "Generate a Personal Access Token"
// 3. Click "Generate token" button
// 4. Copy the generated token (long alphanumeric string)
// 5. Paste it in ArenaConnectModal (do NOT add "Bearer" prefix manually)
//
// AUTHENTICATION:
// - Uses Bearer token authentication
// - Format: Authorization: Bearer {token}
// - Token is automatically prefixed with "Bearer " in request()
//
// ENDPOINTS:
// - GET  /users/me/channels        → list user's channels
// - POST /channels                 → create new channel
// - POST /channels/:slug/blocks    → add block to channel
// - GET  /channels/:slug           → get channel details

export interface ArenaChannel {
  id:       number;
  slug:     string;
  title:    string;
  public:   boolean;
  length:   number;  // number of blocks
}

export interface ArenaBlock {
  id:       number;
  title:    string;
  content?: string;
  source?:  { url: string };
  image?:   { thumb: { url: string } };
}

export interface ArenaConfig {
  accessToken: string;
}

const ARENA_BASE = 'https://api.are.na/v2';

// ── API Client ────────────────────────────────────────────────────────────────

export class ArenaClient {
  private token: string;

  constructor(config: ArenaConfig) {
    this.token = config.accessToken;
  }

  private async request(endpoint: string, method = 'GET', body?: unknown) {
    // Are.na API uses "Bearer" prefix for Personal Access Tokens
    // Remove any existing "Bearer " prefix and add it consistently
    const cleanToken = this.token.replace(/^Bearer\s+/i, '').trim();
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
    };

    const opts: RequestInit = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const url = `${ARENA_BASE}${endpoint}`;
    console.log(`[Are.na API] ${method} ${url}`, 'Token:', cleanToken.substring(0, 10) + '...');
    
    const res = await fetch(url, opts);
    if (!res.ok) {
      let errorMsg = `Are.na API error: ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData.message) errorMsg += ` - ${errorData.message}`;
        console.error('[Are.na API] Error response:', errorData);
      } catch {
        errorMsg += ` ${res.statusText}`;
      }
      console.error(`[Are.na API] ${method} ${url} failed:`, errorMsg);
      throw new Error(errorMsg);
    }
    return res.json();
  }

  /** Get user's channels */
  async getChannels(): Promise<ArenaChannel[]> {
    const data = await this.request('/users/me/channels?per=100');
    return data.channels || [];
  }

  /** Create new channel */
  async createChannel(title: string, isPublic = false): Promise<ArenaChannel> {
    const data = await this.request('/channels', 'POST', {
      title,
      status: isPublic ? 'public' : 'private',
    });
    return data;
  }

  /** Add a link block to a channel */
  async addLinkToChannel(channelSlug: string, url: string, title?: string): Promise<ArenaBlock> {
    const data = await this.request(`/channels/${channelSlug}/blocks`, 'POST', {
      source: url,
      title,
    });
    return data;
  }

  /** Add a text block to a channel */
  async addTextToChannel(channelSlug: string, content: string, title?: string): Promise<ArenaBlock> {
    const data = await this.request(`/channels/${channelSlug}/blocks`, 'POST', {
      content,
      title,
    });
    return data;
  }

  /** Get channel contents */
  async getChannel(channelSlug: string): Promise<{ channel: ArenaChannel; blocks: ArenaBlock[] }> {
    const data = await this.request(`/channels/${channelSlug}`);
    return {
      channel: data,
      blocks: data.contents || [],
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function loadArenaToken(): string | null {
  return localStorage.getItem('arena_access_token');
}

export function saveArenaToken(token: string): void {
  localStorage.setItem('arena_access_token', token);
}

export function clearArenaToken(): void {
  localStorage.removeItem('arena_access_token');
}

export function isArenaConnected(): boolean {
  return !!loadArenaToken();
}
