import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { APP_SETTING_KEYS } from "~/lib/app-settings";
import { AppSettingsService } from "~/server/service/app-settings-service";

export const appSettingsRouter = createTRPCRouter({
  /** Flags every signed-in user may read. Never put anything sensitive here. */
  getPublicFlags: protectedProcedure.query(async () => {
    return {
      feedbackEnabled: await AppSettingsService.isEnabled(
        APP_SETTING_KEYS.FEEDBACK_ENABLED,
      ),
    };
  }),
});
