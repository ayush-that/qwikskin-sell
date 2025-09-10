import { secret } from "encore.dev/config";

const steamUsername = secret("STEAM_USERNAME");
const steamPassword = secret("STEAM_PASSWORD");
const steamSharedSecret = secret("STEAM_SHARED_SECRET");

let SteamUser: any;
let TradeOfferManager: any;
let SteamTotp: any;

async function loadSteamModules() {
  if (!SteamUser) {
    SteamUser = (await import("steam-user")).default;
    TradeOfferManager = (await import("steam-tradeoffer-manager")).default;
    SteamTotp = (await import("steam-totp")).default;
  }
}

export interface SteamTradeOffer {
  id: string;
  partner: string;
  itemsToGive: SteamItem[];
  itemsToReceive: SteamItem[];
  state: number;
  created: Date;
  updated: Date;
  expires: Date;
}

export interface SteamItem {
  appid: number;
  contextid: string;
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
  missing: boolean;
  name?: string;
  market_hash_name?: string;
  icon_url?: string;
  tradable?: boolean;
  marketable?: boolean;
}

class SteamBotManager {
  private client: any;
  private manager: any;
  private isLoggedIn: boolean = false;

  constructor() {}

  async initialize(): Promise<void> {
    try {
      await loadSteamModules();

      console.log("Initializing Steam bot...");

      this.client = new SteamUser();
      this.manager = new TradeOfferManager({
        steam: this.client,
        domain: "qwikskin.com",
        language: "en",
      });

      this.setupEventListeners();

      await this.login();

      console.log("Steam bot initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Steam bot:", error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.client.on("loggedOn", () => {
      console.log("Steam bot logged in successfully");
      this.isLoggedIn = true;
      this.client.setPersona(1);
    });

    this.client.on("error", (err: any) => {
      console.error("Steam client error:", err);
      this.isLoggedIn = false;
    });

    this.manager.on("newOffer", (offer: any) => {
      console.log(`New trade offer received: ${offer.id}`);
    });

    this.manager.on("receivedOfferChanged", (offer: any, oldState: any) => {
      console.log(
        `Trade offer ${offer.id} changed from ${oldState} to ${offer.state}`
      );
    });
  }

  private async login(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loginOptions: any = {
        accountName: steamUsername(),
        password: steamPassword(),
      };

      if (steamSharedSecret()) {
        loginOptions.twoFactorCode = SteamTotp.generateAuthCode(
          steamSharedSecret()
        );
      }

      this.client.logOn(loginOptions);

      this.client.once("loggedOn", () => {
        this.isLoggedIn = true;
        resolve();
      });

      this.client.once("error", (err: any) => {
        reject(err);
      });
    });
  }

  async getTradeOffers(): Promise<SteamTradeOffer[]> {
    if (!this.isLoggedIn) {
      throw new Error("Steam bot is not logged in");
    }

    return new Promise((resolve, reject) => {
      this.manager.getOffers(1, (err: any, sent: any, received: any) => {
        if (err) {
          reject(err);
          return;
        }

        const offers = received.map((offer: any) => ({
          id: offer.id.toString(),
          partner: offer.partner.getSteamID64(),
          itemsToGive: offer.itemsToGive || [],
          itemsToReceive: offer.itemsToReceive || [],
          state: offer.state,
          created: new Date(offer.created * 1000),
          updated: new Date(offer.updated * 1000),
          expires: new Date(offer.expires * 1000),
        }));

        resolve(offers);
      });
    });
  }

  async acceptOffer(offerId: string): Promise<void> {
    if (!this.isLoggedIn) {
      throw new Error("Steam bot is not logged in");
    }

    return new Promise((resolve, reject) => {
      this.manager.getOffer(offerId, (err: any, offer: any) => {
        if (err) {
          reject(err);
          return;
        }

        offer.accept((err: any) => {
          if (err) {
            reject(err);
            return;
          }

          console.log(`Trade offer ${offerId} accepted successfully`);
          resolve();
        });
      });
    });
  }

  async declineOffer(offerId: string): Promise<void> {
    if (!this.isLoggedIn) {
      throw new Error("Steam bot is not logged in");
    }

    return new Promise((resolve, reject) => {
      this.manager.getOffer(offerId, (err: any, offer: any) => {
        if (err) {
          reject(err);
          return;
        }

        offer.decline((err: any) => {
          if (err) {
            reject(err);
            return;
          }

          console.log(`Trade offer ${offerId} declined`);
          resolve();
        });
      });
    });
  }

  async getInventory(
    steamId: string,
    appId: number = 730
  ): Promise<SteamItem[]> {
    if (!this.isLoggedIn) {
      throw new Error("Steam bot is not logged in");
    }

    return new Promise((resolve, reject) => {
      this.manager.getInventoryContents(
        appId,
        2,
        true,
        (err: any, inventory: any) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(inventory || []);
        }
      );
    });
  }

  getTradeUrl(): string {
    if (!this.manager) {
      return "https://steamcommunity.com/tradeoffer/new/?partner=PARTNER_ID&token=TRADE_TOKEN";
    }

    return `https://steamcommunity.com/tradeoffer/new/?partner=${
      this.manager.steamID?.accountid || "PARTNER_ID"
    }&token=${this.manager.apiKey || "TRADE_TOKEN"}`;
  }

  isOnline(): boolean {
    return this.isLoggedIn;
  }
}

export const steamBot = new SteamBotManager();
