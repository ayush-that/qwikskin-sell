import {
  pgTable,
  varchar,
  text,
  timestamp,
  serial,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    steamId: varchar("steam_id", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    steamIdIdx: index("idx_users_steam_id").on(table.steamId),
  })
);

export const sellOrders = pgTable(
  "sell_orders",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    steamId: varchar("steam_id", { length: 255 }).notNull(),
    items: text("items").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    tradeOfferId: varchar("trade_offer_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_sell_orders_user_id").on(table.userId),
    statusIdx: index("idx_sell_orders_status").on(table.status),
    steamIdIdx: index("idx_sell_orders_steam_id").on(table.steamId),
  })
);

export const tradeLogs = pgTable(
  "trade_logs",
  {
    id: serial("id").primaryKey(),
    orderId: varchar("order_id", { length: 255 })
      .notNull()
      .references(() => sellOrders.id),
    action: varchar("action", { length: 100 }).notNull(),
    details: text("details"),
    steamTradeOfferId: varchar("steam_trade_offer_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("idx_trade_logs_order_id").on(table.orderId),
  })
);
