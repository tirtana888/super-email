import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  teamProcedure,
  teamAdminProcedure,
} from "~/server/api/trpc";
import { TeamService } from "~/server/service/team-service";
import { onboardingSchema } from "~/lib/onboarding";
import { notifyFounderOfOnboarding } from "~/server/service/onboarding-service";

export const teamRouter = createTRPCRouter({
  createTeam: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return TeamService.createTeam(ctx.session.user.id, input.name);
    }),

  completeOnboarding: protectedProcedure
    .input(onboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, ...answers } = input;
      const team = await TeamService.createTeam(
        ctx.session.user.id,
        name,
        answers,
      );

      // createTeam returns nothing when the user already has a team (e.g. a double submit).
      if (!team) {
        return { created: false as const };
      }

      await notifyFounderOfOnboarding({
        user: ctx.session.user,
        teamName: team.name,
        answers: input,
      });

      return { created: true as const, teamId: team.id };
    }),

  getTeams: protectedProcedure.query(async ({ ctx }) => {
    return TeamService.getUserTeams(ctx.session.user.id);
  }),

  getTeamUsers: teamProcedure.query(async ({ ctx }) => {
    return TeamService.getTeamUsers(ctx.team.id);
  }),

  getTeamInvites: teamProcedure.query(async ({ ctx }) => {
    return TeamService.getTeamInvites(ctx.team.id);
  }),

  createTeamInvite: teamAdminProcedure
    .input(
      z.object({
        email: z.string(),
        role: z.enum(["MEMBER", "ADMIN"]),
        sendEmail: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return TeamService.createTeamInvite(
        ctx.team.id,
        input.email,
        input.role,
        ctx.team.name,
        input.sendEmail,
      );
    }),

  updateTeamUserRole: teamAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["MEMBER", "ADMIN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return TeamService.updateTeamUserRole(
        ctx.team.id,
        input.userId,
        input.role,
      );
    }),

  deleteTeamUser: teamProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return TeamService.deleteTeamUser(
        ctx.team.id,
        input.userId,
        ctx.teamUser.role,
        ctx.session.user.id,
      );
    }),

  resendTeamInvite: teamAdminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return TeamService.resendTeamInvite(
        ctx.team.id,
        input.inviteId,
        ctx.team.name,
      );
    }),

  deleteTeamInvite: teamAdminProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return TeamService.deleteTeamInvite(ctx.team.id, input.inviteId);
    }),
});
