export default {
  async fetch(request) {
    const BASE_URL = "https://laws.e-gov.go.jp/api/2";

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/api\/egov/, "");
      const target = BASE_URL + path + url.search;

      const egovRes = await fetch(target, {
        headers: { Accept: "application/json" },
      });

      return new Response(egovRes.body, {
        status: egovRes.status,
        headers: {
          "Content-Type":
            egovRes.headers.get("content-type") || "application/json",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "failed to call e-gov api",
          detail: String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
