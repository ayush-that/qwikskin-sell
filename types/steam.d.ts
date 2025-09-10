declare module "steam-user" {
  class SteamUser {
    constructor();
    logOn(details: any): void;
    setPersona(state: number): void;
    on(event: string, callback: (...args: any[]) => void): void;
    once(event: string, callback: (...args: any[]) => void): void;
  }
  export = SteamUser;
}

declare module "steam-tradeoffer-manager" {
  class TradeOfferManager {
    constructor(options: any);
    on(event: string, callback: (...args: any[]) => void): void;
    getOffers(
      filter: number,
      callback: (err: any, sent: any[], received: any[]) => void
    ): void;
    getOffer(id: string, callback: (err: any, offer: any) => void): void;
    getInventoryContents(
      appid: number,
      contextid: number,
      tradableOnly: boolean,
      callback: (err: any, inventory: any[]) => void
    ): void;
    steamID?: any;
    apiKey?: string;
  }
  export = TradeOfferManager;
}

declare module "steam-totp" {
  export function generateAuthCode(sharedSecret: string): string;
}
