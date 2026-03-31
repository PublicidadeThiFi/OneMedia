export interface AdminNewsUser {
  username: string;
  scope: 'news_admin';
}

export interface AdminNewsLoginPayload {
  username: string;
  password: string;
}

export interface AdminNewsLoginResponse {
  user: AdminNewsUser;
  tokens: {
    accessToken: string;
  };
}

export interface AdminNewsMeResponse {
  user: AdminNewsUser;
}
