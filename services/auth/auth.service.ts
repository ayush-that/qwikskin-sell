import { api } from "encore.dev/api";
import { eq } from "drizzle-orm";
import { db, users } from "../../db";

interface SteamAuthRequest {
  steamId: string;
  username: string | null;
  avatarUrl?: string | null;
}

interface User {
  id: string;
  steamId: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateUserRequest {
  userId: string;
  username?: string | null;
}

export const authenticateWithSteam = api(
  { method: "POST", path: "/auth/steam" },
  async (
    req: SteamAuthRequest
  ): Promise<{ user: User; isNewUser: boolean }> => {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.steamId, req.steamId));

    if (existingUser.length > 0) {
      const user = existingUser[0];

      await db
        .update(users)
        .set({
          username: req.username,
          avatarUrl: req.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.steamId, req.steamId));

      return {
        user: {
          ...user,
          username: req.username,
          avatarUrl: req.avatarUrl || null,
        },
        isNewUser: false,
      };
    }

    const userId = generateUserId();
    const newUserData = {
      id: userId,
      steamId: req.steamId,
      username: req.username,
      avatarUrl: req.avatarUrl || null,
    };

    await db.insert(users).values(newUserData);

    const newUser: User = {
      ...newUserData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      user: newUser,
      isNewUser: true,
    };
  }
);

export const getUser = api(
  { method: "GET", path: "/auth/users/:userId" },
  async ({ userId }: { userId: string }): Promise<User | null> => {
    const result = await db.select().from(users).where(eq(users.id, userId));
    return result.length > 0 ? result[0] : null;
  }
);

export const getUserBySteamId = api(
  { method: "GET", path: "/auth/steam/:steamId" },
  async ({ steamId }: { steamId: string }): Promise<User | null> => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.steamId, steamId));
    return result.length > 0 ? result[0] : null;
  }
);

export const updateUser = api(
  { method: "PUT", path: "/auth/users/:userId" },
  async (
    req: UpdateUserRequest
  ): Promise<{ success: boolean; user?: User }> => {
    const updateData: Partial<typeof users.$inferInsert> = {};

    if (req.username) {
      updateData.username = req.username;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false };
    }

    updateData.updatedAt = new Date();

    await db.update(users).set(updateData).where(eq(users.id, req.userId));

    const updatedUser = await getUser({ userId: req.userId });

    return {
      success: true,
      user: updatedUser || undefined,
    };
  }
);

export const validateUserForSelling = api(
  { method: "GET", path: "/auth/users/:userId/validate-selling" },
  async ({
    userId,
  }: {
    userId: string;
  }): Promise<{ canSell: boolean; reason?: string }> => {
    const user = await getUser({ userId });

    if (!user) {
      return { canSell: false, reason: "User not found" };
    }

    return { canSell: true };
  }
);

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
