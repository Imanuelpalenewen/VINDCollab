import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Called on every sign-in/sign-up
      if (args.existingUserId !== null) {
        return args.existingUserId;
      }

      const email = String(args.profile.email ?? "").toLowerCase();
      const name = String(args.profile.name ?? email.split("@")[0]);

      // Check if user was already seeded by the dummy script!
      const existingSeededUser = await (ctx.db as any)
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();

      if (existingSeededUser) {
        return existingSeededUser._id;
      }

      // Completely new user: insert into our custom users table
      return await ctx.db.insert("users", {
        email,
        name,
        role: "admin",
      });
    },
  },
});
