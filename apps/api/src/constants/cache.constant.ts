export enum CacheKey {
  ResetPasswordMailLastSentAt = 'auth:reset-password-mail:%s:last-sent-at', // %s: userId
  RolePermissions = 'roles:%s:permissions', // %s: sorted comma-joined role names
  UsedAuthToken = 'auth:used-token:%s', // %s: sha256 of the one-time token
}
