import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

const BASE_URL = "https://laws.e-gov.go.jp/api/2";

async function callEgov(path, params) {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set("response_format", "json");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  return await res.text();
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "search_laws",
      "法令名や法令番号から法令を検索します。法令の一覧を取得できます。",
      {
        law_name: z.string().optional().describe("法令名（部分一致）"),
        law_num: z.string().optional().describe("法令番号"),
      },
      async ({ law_name, law_num }) => {
        const result = await callEgov("/laws", {
          law_name,
          law_num,
        });
        return {
          content: [{ type: "text", text: result }],
        };
      }
    );

    server.tool(
      "get_law_data",
      "法令IDまたは法令番号を指定して、法令の本文を取得します。",
      {
        law_id: z.string().describe("法令IDまたは法令番号"),
        date: z.string().optional().describe("時点指定（YYYY-MM-DD形式）"),
      },
      async ({ law_id, date }) => {
        const result = await callEgov(
          "/law_data/" + encodeURIComponent(law_id),
          { date }
        );
        return {
          content: [{ type: "text", text: result }],
        };
      }
    );

    server.tool(
      "keyword_search",
      "キーワードで法令の条文を全文検索します。",
      {
        keyword: z.string().describe("検索キーワード"),
        date: z.string().optional().describe("時点指定（YYYY-MM-DD形式）"),
      },
      async ({ keyword, date }) => {
        const result = await callEgov("/keyword", { keyword, date });
        return {
          content: [{ type: "text", text: result }],
        };
      }
    );
  },
  {
    name: "e-gov-law-search",
    version: "1.0.0",
  }
);

export { handler as GET, handler as POST, handler as DELETE };
