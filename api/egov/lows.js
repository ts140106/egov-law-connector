// api/egov/laws.js
export default async function handler(req, res) {
  const BASE_URL = "https://laws.e-gov.go.jp/api/2";

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);

    // /api/egov/laws → /laws に変換
    const path = url.pathname.replace(/^\/api\/egov/, "");
    const target = BASE_URL + path + url.search;

    const egovRes = await fetch(target, {
      method: req.method,
      headers: {
        Accept: "application/json",
      },
    });

    const text = await egovRes.text();
    res.status(egovRes.status);
    res.setHeader(
      "Content-Type",
      egovRes.headers.get("content-type") || "application/json"
    );
    res.send(text);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "failed to call e-gov api", detail: String(error) });
  }
}
