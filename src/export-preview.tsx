import { useState } from "react";
import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { defaults, generateSquad } from "./engine";
import ExportCard from "./ExportCard";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "./app.css";
import "./export-card.css";
const ids = ["101010001", "101060001", "102010001", "102010008"];
const samples = generateSquad(
  "share-card-design",
  ids.map((id) => ({
    ...structuredClone(defaults),
    maps: ["farm"],
    modes: ["normal"],
    categories: { ...defaults.categories, gun: false, second: false },
    fixed: { gun: id },
  })),
);
function Preview() {
  const [squad, setSquad] = useState(
      new URLSearchParams(location.search).get("players") === "4",
    ),
    [image, setImage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const kits = squad ? samples : [samples[0]];
  return (
    <main
      style={{
        maxWidth: 1040,
        margin: "30px auto",
        padding: "0 20px",
        fontFamily: "Barlow,Arial,sans-serif",
        color: "#e8e4d4",
      }}
    >
      <header
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>Share card draft</h1>
        <span style={{ fontSize: 12, color: "#a9b99a" }}>
          Sample kits / field manifest
        </span>
        <button
          style={button}
          onClick={() => {
            setSquad(false);
            setImage(null);
          }}
        >
          Solo preview
        </button>
        <button
          style={button}
          onClick={() => {
            setSquad(true);
            setImage(null);
          }}
        >
          Squad preview
        </button>
        <button
          style={button}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await document.fonts.ready;
              setImage(
                await toPng(document.getElementById("card-study")!, {
                  pixelRatio: 1.5,
                  backgroundColor: "#131d17",
                }),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Rendering..." : "Render image"}
        </button>
      </header>
      <div id="card-study">
        <ExportCard kits={kits} />
      </div>
      {image && (
        <figure className="export-preview">
          <img
            src={image}
            alt={squad ? "Squad share card preview" : "Solo share card preview"}
          />
          <figcaption>
            <a
              href={image}
              download={
                squad ? "abi-squad-share-card.png" : "abi-solo-share-card.png"
              }
            >
              Download preview
            </a>
          </figcaption>
        </figure>
      )}
    </main>
  );
}
const button = {
  background: "#293c2a",
  border: "1px solid #829471",
  color: "#e8e4d4",
  padding: "9px 13px",
  cursor: "pointer",
};
document.body.style.margin = "0";
document.body.style.background = "#101912";
createRoot(document.getElementById("root")!).render(<Preview />);
