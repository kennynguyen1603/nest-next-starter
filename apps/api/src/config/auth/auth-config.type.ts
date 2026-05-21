import ms from 'ms';

export type AuthConfig = {
  secret?: string;
  expires?: ms.StringValue;
  refreshSecret?: string;
  refreshExpires?: ms.StringValue;
  forgotSecret?: string;
  forgotExpires?: ms.StringValue;
  confirmEmailSecret?: string;
  confirmEmailExpires?: ms.StringValue;
  resetPasswordCooldown?: ms.StringValue;
  basicAuth: {
    username: string;
    password: string;
  };
};
