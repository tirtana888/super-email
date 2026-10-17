import {
  parseBooleanSetting,
  type AppSettingKey,
} from "~/lib/app-settings";
import { db } from "../db";
import { getRedis, redisKey, withCache } from "../redis";

const SETTING_CACHE_TTL_SECONDS = 60;

function cacheKey(key: AppSettingKey) {
  return `app-setting:${key}`;
}

export class AppSettingsService {
  /** Missing settings are off, so new switches stay hidden until an admin turns them on. */
  static async isEnabled(key: AppSettingKey): Promise<boolean> {
    return withCache(
      cacheKey(key),
      async () => {
        const setting = await db.appSetting.findUnique({ where: { key } });
        return parseBooleanSetting(setting?.value);
      },
      { ttlSeconds: SETTING_CACHE_TTL_SECONDS },
    );
  }

  static async setEnabled(key: AppSettingKey, enabled: boolean): Promise<void> {
    const value = String(enabled);

    await db.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });

    await getRedis().del(redisKey(cacheKey(key)));
  }
}
