import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#f6f5f1",
          color: "#162434",
          alignItems: "center",
          justifyContent: "center",
          gap: 44,
          padding: "72px"
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 52,
            background: "linear-gradient(135deg, #1574d4 0%, #0d5fb9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 138,
            fontWeight: 800,
            lineHeight: 1
          }}
        >
          P
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}
        >
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.02 }}>Patrick</div>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.02 }}>Tech Co.</div>
          <div
            style={{
              marginTop: 20,
              fontSize: 54,
              fontWeight: 700,
              letterSpacing: 8,
              alignSelf: "flex-end"
            }}
          >
            VN
          </div>
        </div>
      </div>
    ),
    size
  );
}
