const endpoint = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

type PredictInput = {
  sku: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  total30dSales: number;
  costPrice: number;
  sellingPrice: number;
};

function safeJsonParse<T>(text: string): T | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const jsonSlice = start !== -1 && end !== -1 ? text.slice(start, end + 1) : text;
    return JSON.parse(jsonSlice) as T;
  } catch {
    return null;
  }
}

export async function checkGroq(): Promise<boolean> {
  if (!process.env.GROQ_API_KEY) return false;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a concise service. Only output a minimal JSON object with fields: ok:boolean.",
          },
          { role: "user", content: "Respond with {\"ok\":true}" },
        ],
        temperature: 0.1,
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as any;
    const txt = data.choices?.[0]?.message?.content || "";
    const json = safeJsonParse<{ ok: boolean }>(txt);
    return !!json?.ok;
  } catch {
    return false;
  }
}

export async function predictInventory(input: PredictInput): Promise<{
  predicted_30d_demand: number;
  decision: "INCREASE" | "MAINTAIN" | "REDUCE";
  risk_score: number;
  turnover_ratio: number;
}> {
  if (!process.env.GROQ_API_KEY) {
    const predicted = Math.max(0, Math.round(input.avgDailySales * 30));
    const turnover =
      input.currentStock > 0 ? Number((predicted / input.currentStock).toFixed(2)) : predicted > 0 ? 2 : 0;
    let decision: "INCREASE" | "MAINTAIN" | "REDUCE" = "MAINTAIN";
    if (input.currentStock < predicted * 0.9) decision = "INCREASE";
    else if (input.currentStock > predicted * 1.2) decision = "REDUCE";
    const risk = Math.max(0, Math.min(1, (input.currentStock - predicted) / Math.max(1, input.currentStock)));
    return {
      predicted_30d_demand: predicted,
      decision,
      risk_score: Number(risk.toFixed(2)),
      turnover_ratio: turnover,
    };
  }

  const prompt =
    `You are an inventory optimization engine. Respond with a strict JSON object only, no prose.\n` +
    `Fields: predicted_30d_demand:number, decision:("INCREASE"|"MAINTAIN"|"REDUCE"), risk_score:number(0..1), turnover_ratio:number.\n` +
    `Data:\n` +
    `SKU: ${input.sku}\n` +
    `Product: ${input.productName}\n` +
    `CurrentStock: ${input.currentStock}\n` +
    `AvgDailySales: ${input.avgDailySales}\n` +
    `Total30dSales: ${input.total30dSales}\n` +
    `CostPrice: ${input.costPrice}\n` +
    `SellingPrice: ${input.sellingPrice}\n` +
    `Rules:\n` +
    `- predicted_30d_demand should be a non-negative integer.\n` +
    `- decision is INCREASE if CurrentStock < 0.9*predicted; REDUCE if CurrentStock > 1.2*predicted; otherwise MAINTAIN.\n` +
    `- risk_score between 0 and 1.\n` +
    `Respond with JSON only.`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You output JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const predicted = Math.max(0, Math.round(input.avgDailySales * 30));
    const turnover =
      input.currentStock > 0 ? Number((predicted / input.currentStock).toFixed(2)) : predicted > 0 ? 2 : 0;
    let decision: "INCREASE" | "MAINTAIN" | "REDUCE" = "MAINTAIN";
    if (input.currentStock < predicted * 0.9) decision = "INCREASE";
    else if (input.currentStock > predicted * 1.2) decision = "REDUCE";
    const risk = Math.max(0, Math.min(1, (input.currentStock - predicted) / Math.max(1, input.currentStock)));
    return {
      predicted_30d_demand: predicted,
      decision,
      risk_score: Number(risk.toFixed(2)),
      turnover_ratio: turnover,
    };
  }

  const data = (await res.json()) as any;
  const txt = data.choices?.[0]?.message?.content || "";
  const parsed = safeJsonParse<{
    predicted_30d_demand: number;
    decision: "INCREASE" | "MAINTAIN" | "REDUCE";
    risk_score: number;
    turnover_ratio: number;
  }>(txt);
  if (parsed && Number.isFinite(parsed.predicted_30d_demand)) {
    return {
      predicted_30d_demand: Math.max(0, Math.round(parsed.predicted_30d_demand)),
      decision: parsed.decision,
      risk_score: Math.max(0, Math.min(1, Number(parsed.risk_score.toFixed?.(2) ?? parsed.risk_score))),
      turnover_ratio: Number(Number(parsed.turnover_ratio).toFixed?.(2) ?? parsed.turnover_ratio),
    };
  }

  const predicted = Math.max(0, Math.round(input.avgDailySales * 30));
  const turnover =
    input.currentStock > 0 ? Number((predicted / input.currentStock).toFixed(2)) : predicted > 0 ? 2 : 0;
  let decision: "INCREASE" | "MAINTAIN" | "REDUCE" = "MAINTAIN";
  if (input.currentStock < predicted * 0.9) decision = "INCREASE";
  else if (input.currentStock > predicted * 1.2) decision = "REDUCE";
  const risk = Math.max(0, Math.min(1, (input.currentStock - predicted) / Math.max(1, input.currentStock)));
  return {
    predicted_30d_demand: predicted,
    decision,
    risk_score: Number(risk.toFixed(2)),
    turnover_ratio: turnover,
  };
}

