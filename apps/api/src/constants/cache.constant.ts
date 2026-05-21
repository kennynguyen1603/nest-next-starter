export enum CacheKey {
  EmailVerificationToken = 'auth:token:%s:email-verification', // %s: userId
  UserSocketClients = 'socket:%s:clients', // %s: userId
  EmailVerificationMailLastSentAt = 'auth:email-verification-mail:%s:last-sent-at', // %s: userId
  ResetPasswordMailLastSentAt = 'auth:reset-password-mail:%s:last-sent-at', // %s: userId
  RolePermissions = 'roles:%s:permissions', // %s: sorted comma-joined role names
}
