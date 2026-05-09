export interface FacebookInterface {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

export interface FacebookErrorResponse {
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

export interface FacebookDebugTokenResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
  };
}

export interface FacebookTokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
