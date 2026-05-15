import { CacheKey } from '@/constants/cache.constant';

export type CacheParam = { key: keyof typeof CacheKey; args?: string[] };
