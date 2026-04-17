import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Called on every sign-in/sign-up
      // args.existingUserId is set for returning users — skip re-creation
      if (args.existingUserId !== null) {
        return args.existingUserId;
      }
      // New user: insert into our custom users table
      const email = String(args.profile.email ?? "");
      const name = String(args.profile.name ?? email.split("@")[0]);
      return await ctx.db.insert("users", {
        email,
        name,
        role: "admin",
      });
    },
  },
});
