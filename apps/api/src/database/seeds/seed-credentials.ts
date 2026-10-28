const isProduction = process.env.NODE_ENV === 'production';

// Production never gets the well-known dev password: the admin is only seeded
// when SEED_ADMIN_PASSWORD is provided, and the demo user is skipped entirely.
export const seedAdminPassword =
  process.env.SEED_ADMIN_PASSWORD || (isProduction ? undefined : 'secret');

export const seedDemoUser = !isProduction;
