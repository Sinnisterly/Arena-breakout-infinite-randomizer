export type PartChoice = { slot: string; ids: string[]; optional?: boolean };
export type PartRule = { requires?: string[][]; excludes?: string[] };
export type WeaponPlan = {
  id: string;
  parts: PartChoice[];
  magazines: string[];
  internal?: boolean;
  internalCapacity?: number;
  internalMagazines?: string[];
  basicParts?: string[];
  basicMagazine?: string;
  basis?: string;
  availability?: "unconfirmed";
  availabilityNote?: string;
  rules?: Record<string, PartRule>;
  sources: string[];
  verification: "source-backed" | "best-guess" | "in-game-checked";
};
