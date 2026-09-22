function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'not available';

  return `INR ${number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function formatMarketCap(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'not available';

  const crores = number / 10000000;
  if (crores >= 100000) {
    return `INR ${(crores / 100000).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })} lakh crore`;
  }

  return `INR ${crores.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })} crore`;
}

function getRecentTrend(history = []) {
  if (!Array.isArray(history) || history.length < 2) {
    return { label: 'unavailable', percent: null };
  }

  const cleanRows = history
    .filter((row) => Number.isFinite(Number(row.close)))
    .slice(-30);

  if (cleanRows.length < 2) {
    return { label: 'unavailable', percent: null };
  }

  const firstClose = Number(cleanRows[0].close);
  const lastClose = Number(cleanRows[cleanRows.length - 1].close);
  if (!firstClose) return { label: 'unavailable', percent: null };

  const percent = ((lastClose - firstClose) / firstClose) * 100;
  return {
    label: percent >= 0 ? 'positive' : 'negative',
    percent,
  };
}

function buildFallbackAiBrief(stock) {
  const trend = getRecentTrend(stock.history5y);
  const peRatio = Number(stock.peRatio);
  const dayChange = Number(stock.dayChangePercent || 0);
  const hasPrice = Number(stock.lastPrice) > 0;

  const bullets = [
    `${stock.name || stock.ticker} is listed on NSE under ${stock.ticker} and operates in ${stock.industry || stock.sector || 'its reported sector'}.`,
    `Latest available price is ${hasPrice ? formatCurrency(stock.lastPrice) : 'not available'}, with today's move at ${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}%.`,
    `Market cap is ${formatMarketCap(stock.marketCap)} and trailing P/E is ${Number.isFinite(peRatio) && peRatio > 0 ? peRatio.toFixed(2) : 'not available'}.`,
  ];

  if (trend.percent !== null) {
    bullets.push(`Recent 30-session price trend is ${trend.label}, moving ${trend.percent >= 0 ? '+' : ''}${trend.percent.toFixed(2)}%.`);
  }

  return {
    generatedBy: 'local-ai-fallback',
    overview: stock.businessSummary
      || `${stock.name || stock.ticker} is an Indian equity in the ${stock.sector || 'NSE'} universe. The brief below summarizes available profile, valuation, price, and range data.`,
    stockDetails: bullets,
    strengths: [
      Number(stock.marketCap) > 0 ? 'Large reported market capitalization improves visibility and tracking.' : 'Basic company profile is available even though live market data is incomplete.',
      Number(stock.week52High) > 0 && Number(stock.week52Low) > 0 ? '52-week range is available for context.' : 'Fallback profile keeps the company page usable during market-data outages.',
    ],
    watchouts: [
      !hasPrice ? 'Live price data is currently unavailable, so price-sensitive conclusions should be delayed.' : 'Short-term price movement can change quickly during market hours.',
      'This is an informational summary, not financial advice.',
    ],
    verdict: `Use ${stock.ticker} as a research candidate and compare valuation, trend, business quality, and sector conditions before deciding.`,
  };
}

function parseJsonFromText(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
}

function buildPrompt(stock) {
  return `Create a concise investor-friendly company brief for this Indian stock.

Return only valid JSON with this exact shape:
{
  "overview": "2-3 sentence company summary",
  "stockDetails": ["detail bullet", "detail bullet", "detail bullet"],
  "strengths": ["strength bullet", "strength bullet"],
  "watchouts": ["watchout bullet", "watchout bullet"],
  "verdict": "one balanced research takeaway, not financial advice"
}

Use only the provided data. Do not invent financial figures.

Stock data:
${JSON.stringify({
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    industry: stock.industry,
    website: stock.website,
    businessSummary: stock.businessSummary,
    marketCap: stock.marketCap,
    peRatio: stock.peRatio,
    week52High: stock.week52High,
    week52Low: stock.week52Low,
    lastPrice: stock.lastPrice,
    dayChangePercent: stock.dayChangePercent,
    dataSource: stock.dataSource,
  }, null, 2)}`;
}

async function generateOpenAiBrief(stock) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-5';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(stock),
      text: {
        format: {
          type: 'json_object',
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed with status ${response.status}`);
  }

  const parsed = parseJsonFromText(payload?.output_text);
  if (!parsed) {
    throw new Error('OpenAI response did not contain valid JSON.');
  }

  return {
    generatedBy: `openai:${model}`,
    ...parsed,
  };
}

async function generateAiCompanyBrief(stock) {
  try {
    const openAiBrief = await generateOpenAiBrief(stock);
    if (openAiBrief) return openAiBrief;
  } catch (err) {
    console.error(`[AI Summary] OpenAI generation failed for ${stock.ticker}: ${err.message}`);
  }

  return buildFallbackAiBrief(stock);
}

module.exports = {
  generateAiCompanyBrief,
};
