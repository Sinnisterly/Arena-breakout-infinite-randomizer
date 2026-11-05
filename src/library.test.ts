import { describe, it, expect, vi } from "vitest";
import {
  emptyLibrary,
  loadLibrary,
  saveLibrary,
  parseBackup,
  encodeShare,
  decodeShare,
} from "./storage";
import { defaults, generateSquad, validate } from "./engine";
describe("local library and exact squad saves", () => {
  it("keeps presets, history, settings, and a full squad through storage and backup reloads", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    try {
      const library = emptyLibrary();
      const config = {
        ...defaults,
        randomizeAttachments: false,
        priceMargin: 15,
      };
      const squad = generateSquad("library-qa", [
        config,
        config,
        config,
        config,
      ]);
      library.settings = config;
      library.presets = [
        { id: "preset", name: "Basic builds", settings: config },
      ];
      library.saved = [
        {
          id: "saved",
          name: "Squad kit",
          date: "2026-11-05",
          favorite: true,
          kits: squad,
        },
      ];
      library.history = [{ ...library.saved[0], id: "history" }];
      saveLibrary(library);
      expect(loadLibrary()).toEqual(library);
      expect(parseBackup(JSON.stringify(library))).toEqual(library);
      const restored = decodeShare(encodeShare(squad, config)).kits;
      expect(restored).toEqual(squad);
      expect(
        restored.flatMap(validate).filter((i) => i.severity === "error"),
      ).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
