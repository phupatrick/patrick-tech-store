import { User } from "@/lib/types";

export const users: User[] = [
  {
    id: "u-admin-1",
    name: "Patrick Admin",
    phone: "0909000111",
    role: "admin",
    tier: "guest",
    overridePriceMap: {},
    points: 999,
    countryCode: "VN"
  },
  {
    id: "u-reseller-1",
    name: "Minh Regular",
    phone: "0909555001",
    role: "reseller",
    tier: "regular",
    overridePriceMap: { "office-suite": 910000 },
    points: 120,
    countryCode: "VN"
  },
  {
    id: "u-reseller-2",
    name: "Alex Reseller",
    phone: "+12025550190",
    role: "reseller",
    tier: "regular",
    overridePriceMap: { "windows-pro-key": 640000 },
    points: 420,
    countryCode: "US"
  },
  {
    id: "u-guest-1",
    name: "Guest Buyer",
    phone: "0988000111",
    role: "guest",
    tier: "guest",
    overridePriceMap: {},
    points: 0,
    countryCode: "VN"
  }
];
