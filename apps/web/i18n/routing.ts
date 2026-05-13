import { defineRouting } from 'next-intl/routing';
import { SUPPORTED_LOCALES } from '@repo/types';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: 'en',
});
