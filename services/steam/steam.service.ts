import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { steamBot } from "../../utils/steam-bot";

const steamUsername = secret("STEAM_USERNAME");
const steamPassword = secret("STEAM_PASSWORD");
const steamSharedSecret = secret("STEAM_SHARED_SECRET");

interface TradeOffer {
  id: string;
  steamId: string;
  items: SteamItem[];
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: Date;
}

interface SteamItem {
  assetId: string;
  classId: string;
  instanceId: string;
  appId: number;
  contextId: string;
  name: string;
  marketHashName: string;
  iconUrl: string;
  tradable: boolean;
}

interface SteamBotStatus {
  isOnline: boolean;
  isLoggedIn: boolean;
  steamId?: string;
}

export const getBotStatus = api(
  { method: "GET", path: "/steam/status" },
  async (): Promise<SteamBotStatus> => {
    return {
      isOnline: steamBot.isOnline(),
      isLoggedIn: steamBot.isOnline(),
      steamId: steamBot.isOnline() ? "BOT_STEAM_ID" : undefined,
    };
  }
);

export const initializeBot = api(
  { method: "POST", path: "/steam/initialize" },
  async (): Promise<{ success: boolean; message: string }> => {
    try {
      steamBot.setCredentials({
        username: steamUsername(),
        password: steamPassword(),
        sharedSecret: steamSharedSecret(),
      });
      await steamBot.initialize();
      return {
        success: true,
        message: "Steam bot initialized successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to initialize Steam bot: ${error}`,
      };
    }
  }
);

export const getTradeOffers = api(
  { method: "GET", path: "/steam/trade-offers" },
  async (): Promise<{ offers: TradeOffer[] }> => {
    try {
      const offers = await steamBot.getTradeOffers();
      return {
        offers: offers.map((offer) => ({
          id: offer.id,
          steamId: offer.partner,
          items: offer.itemsToReceive.map((item: any) => ({
            assetId: item.assetid || "",
            classId: item.classid || "",
            instanceId: item.instanceid || "",
            appId: item.appid || 730,
            contextId: item.contextid || "2",
            name: item.name || "",
            marketHashName: item.market_hash_name || "",
            iconUrl: item.icon_url || "",
            tradable: item.tradable || false,
            marketable: item.marketable || false,
          })),
          status: "pending" as const,
          createdAt: offer.created,
        })),
      };
    } catch (error) {
      console.error("Failed to fetch trade offers:", error);
      return { offers: [] };
    }
  }
);

export const acceptTradeOffer = api(
  { method: "POST", path: "/steam/trade-offers/:offerId/accept" },
  async ({
    offerId,
  }: {
    offerId: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      await steamBot.acceptOffer(offerId);
      return {
        success: true,
        message: `Trade offer ${offerId} accepted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to accept trade offer: ${error}`,
      };
    }
  }
);

export const declineTradeOffer = api(
  { method: "POST", path: "/steam/trade-offers/:offerId/decline" },
  async ({
    offerId,
  }: {
    offerId: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      await steamBot.declineOffer(offerId);
      return {
        success: true,
        message: `Trade offer ${offerId} declined`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to decline trade offer: ${error}`,
      };
    }
  }
);
