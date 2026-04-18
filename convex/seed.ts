import { internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const DUMMY_ORGS = [
  {
    email: "uvics@unklab.edu",
    name: "UVICS (Unklab Virtue in CS)",
    category: "Tech Club",
    capabilities: ["Programming", "Competition", "Tech Mentorship", "Hackathon"],
    role: "admin",
  },
  {
    email: "proxo@unklab.edu",
    name: "PROXO",
    category: "Event Organizer",
    capabilities: ["International Event", "Event Setup", "Host", "Logistics", "Networking"],
    role: "admin",
  },
  {
    email: "vocs@unklab.edu",
    name: "VOCS (Voice of CS)",
    category: "Arts & Culture",
    capabilities: ["Music", "Performance", "Entertainment", "Choir", "Audio Production"],
    role: "admin",
  },
  {
    email: "media@unklab.edu",
    name: "Pusat Media Unklab",
    category: "Media",
    capabilities: ["Photography", "Videography", "Live Streaming", "Media Coverage", "Editing"],
    role: "admin",
  },
  {
    email: "kec@unklab.edu",
    name: "Klabat English Club",
    category: "Academic",
    capabilities: ["Translation", "Bilingual MC", "Communication", "International Protocol"],
    role: "admin",
  },
  {
    email: "robotics@unklab.edu",
    name: "Unklab Robotics Society",
    category: "Tech Club",
    capabilities: ["Hardware", "IoT", "Innovation Demos", "Exhibition Setup", "Automation"],
    role: "admin",
  },
  {
    email: "himade@unklab.edu",
    name: "HIMADE (Desain)",
    category: "Design",
    capabilities: ["UI/UX", "Visual Assets", "Booth Decoration", "Graphic Design"],
    role: "admin",
  },
  {
    email: "feb@unklab.edu",
    name: "BEM Fakultas Ekonomi",
    category: "Faculty Club",
    capabilities: ["Sponsorship", "Marketing", "Finance", "Budgeting", "Project Management"],
    role: "admin",
  },
];

/** Generates a random 6-char alphanumeric invite code */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Internal mutation to insert the organization and its initial user.
 * We use an internal mutation because seeding shouldn't be publicly accessible.
 */
export const seedSingleOrg = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    category: v.string(),
    capabilities: v.array(v.string()),
    role: v.string(), // "admin"
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      console.log(`Skipping ${args.email} - already exists in the database.`);
      return;
    }

    // 1. Create Organization
    const inviteCode = generateInviteCode();
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      category: args.category,
      capabilities: args.capabilities,
      isVerified: true,
      inviteCode,
      inviteCodeCreatedAt: Date.now(),
    });

    // 2. Create User account (without setting auth password - Convex auth uses separate provider table, 
    // but the system will link the email automatically when they sign up).
    // Note: Since this seeds the users table, they still need to "Register" with password
    // via the frontend so that `@convex-dev/auth` stores their credentials.
    // However, if they Register with these emails, their Convex Auth account will be created
    // but we want to make sure the users table maps. To avoid complex auth seeding,
    // we'll just seed the table so when they login, we might need a custom mapping.
    
    // As a workaround, the best way for the user to login with dummy data is to let them 
    // manually register using the app OR we can just seed the users table now, and when they 
    // `signIn("password", { email... })` the `@convex-dev/auth` handles storing the password.
    // Actually, `@convex-dev/auth` handles users automatically on "signUp". 
    // Instead of messing with Convex Auth internals, we'll just insert the `users` 
    // and `organizations` records directly. Convex auth might fail to login if the password isn't in its internal tables.
    // So the EASIEST workaround for seeding auth is to let you register these emails from the app manually,
    // OR we don't insert to `users` and let you create the org via the app.
    // WAIT: I can just use a trick. The developer will use these accounts as targets for recommendations!
    // They don't actually need to LOGIN to these 8 dummy accounts right now. They just need the ORGS to exist.
    // So we just create the Orgs, and assign a fake user to them, or no user at all!

    await ctx.db.insert("users", {
      email: args.email,
      name: `Admin of ${args.name}`,
      orgId: orgId,
      role: "admin",
    });

    console.log(`Seeded organization: ${args.name}`);
  },
});

export const seedUnklab = internalAction({
  args: {},
  handler: async (ctx) => {
    for (const data of DUMMY_ORGS) {
      await ctx.runMutation(internal.seed.seedSingleOrg, data);
    }
    return "Successfully seeded 8 Univeritas Klabat Dummy Organizations!";
  },
});
