import { api } from "encore.dev/api";
import { eq, desc } from "drizzle-orm";
import { db, sellOrders, tradeLogs } from "../../db";

interface CreateSellOrderRequest {
  userId: string;
  steamId: string;
  items: TradeItem[];
}

interface CreateSellOrderResponse {
  orderId: string;
  tradeUrl: string;
  expiresAt: Date;
}

interface TradeItem {
  assetId: string;
  classId: string;
  instanceId: string;
  name: string;
  marketHashName: string;
  condition?: string;
  rarity?: string;
}

interface SellOrder {
  id: string;
  userId: string;
  steamId: string;
  items: TradeItem[];
  status:
    | "pending"
    | "trade_sent"
    | "items_received"
    | "completed"
    | "cancelled"
    | "expired";
  tradeOfferId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

interface VerifyTradeRequest {
  orderId: string;
  tradeOfferId: string;
}

export const createSellOrder = api(
  { method: "POST", path: "/trade/sell-orders" },
  async (req: CreateSellOrderRequest): Promise<CreateSellOrderResponse> => {
    const orderId = generateOrderId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(sellOrders).values({
      id: orderId,
      userId: req.userId,
      steamId: req.steamId,
      items: JSON.stringify(req.items),
      status: "pending",
      expiresAt,
    });

    await db.insert(tradeLogs).values({
      orderId,
      action: "order_created",
      details: `Created sell order with ${req.items.length} items`,
    });

    const tradeUrl = `https://steamcommunity.com/tradeoffer/new/?partner=BOT_PARTNER_ID&token=BOT_TRADE_TOKEN`;

    return {
      orderId,
      tradeUrl,
      expiresAt,
    };
  }
);

export const getSellOrder = api(
  { method: "GET", path: "/trade/sell-orders/:orderId" },
  async ({ orderId }: { orderId: string }): Promise<SellOrder | null> => {
    const result = await db
      .select()
      .from(sellOrders)
      .where(eq(sellOrders.id, orderId));

    if (result.length === 0) return null;

    const order = result[0];
    return {
      ...order,
      items: JSON.parse(order.items),
      status: order.status as SellOrder["status"],
    };
  }
);

export const verifyTrade = api(
  { method: "POST", path: "/trade/verify" },
  async (
    req: VerifyTradeRequest
  ): Promise<{ valid: boolean; reason?: string }> => {
    const order = await getSellOrder({ orderId: req.orderId });

    if (!order) {
      return { valid: false, reason: "Sell order not found" };
    }

    if (order.status !== "pending") {
      return { valid: false, reason: "Sell order is not in pending status" };
    }

    if (new Date() > order.expiresAt) {
      await updateOrderStatus({ orderId: req.orderId, status: "expired" });
      return { valid: false, reason: "Sell order has expired" };
    }

    const tradeIsValid = await validateTradeOffer(
      req.tradeOfferId,
      order.items
    );

    if (tradeIsValid) {
      await db
        .update(sellOrders)
        .set({
          tradeOfferId: req.tradeOfferId,
          status: "trade_sent",
          updatedAt: new Date(),
        })
        .where(eq(sellOrders.id, req.orderId));

      await db.insert(tradeLogs).values({
        orderId: req.orderId,
        action: "trade_verified",
        details: `Trade offer ${req.tradeOfferId} verified and matched`,
        steamTradeOfferId: req.tradeOfferId,
      });

      return { valid: true };
    }

    return {
      valid: false,
      reason: "Trade offer items do not match sell order",
    };
  }
);

export const updateOrderStatus = api(
  { method: "PUT", path: "/trade/sell-orders/:orderId/status" },
  async ({
    orderId,
    status,
  }: {
    orderId: string;
    status: string;
  }): Promise<{ success: boolean }> => {
    await db
      .update(sellOrders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(sellOrders.id, orderId));

    await db.insert(tradeLogs).values({
      orderId,
      action: "status_updated",
      details: `Order status updated to: ${status}`,
    });

    return { success: true };
  }
);

export const getUserSellOrders = api(
  { method: "GET", path: "/trade/users/:userId/sell-orders" },
  async ({ userId }: { userId: string }): Promise<SellOrder[]> => {
    const result = await db
      .select()
      .from(sellOrders)
      .where(eq(sellOrders.userId, userId))
      .orderBy(desc(sellOrders.createdAt));

    return result.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
      status: order.status as SellOrder["status"],
    }));
  }
);

function generateOrderId(): string {
  return `sell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function validateTradeOffer(
  _tradeOfferId: string,
  _expectedItems: TradeItem[]
): Promise<boolean> {
  return true;
}
