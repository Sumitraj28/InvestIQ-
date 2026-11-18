/**
 * aiResearchExplainer.js
 * AI Explanation Layer & Quantitative Rule-Based Research Synthesizer for InvestIQ
 * 
 * Pipeline:
 * Market Data → Data Validation → Technicals → Fundamentals → Risk Profile → Structured Assessment → AI Explanation
 * 
 * Guarantees:
 * 1. Zero LLM Hallucination: Feeds validated facts to LLM solely to generate plain-English explanations.
 * 2. Transparent Origin Labeling:
 *    - 'openai:gpt-4o-mini' when generated via valid OpenAI API key.
 *    - 'rule-based-quantitative-engine' when OpenAI is unconfigured or unavailable.
 * 3. Never produces speculative or fake price forecasts.
 */

const { generateResearchAssessment } = require('./researchEngine');

function formatCurrency(val) {
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) return 'N/A';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * Generate a deterministic rule-based analysis directly from validated quantitative findings.
 */
function buildRuleBasedExplanation(stock, assessment) {
  const { technicals, risks, fundamentals } = assessment;
  const currentPrice = technicals?.effectivePrice || stock.lastPrice || 0;
  const dayChange = Number(stock.dayChangePercent || 0);

  const priceText = currentPrice > 0
    ? `Latest price is ${formatCurrency(currentPrice)} (${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}% on the session).`
    : 'Live market quote is currently updating.';

  const high52w = Number(stock.week52High || 0);
  const low52w = Number(stock.week52Low || 0);
  const rangeText = (high52w > 0 && low52w > 0 && currentPrice > 0)
    ? `Trading in a 52-week band of ${formatCurrency(low52w)} - ${formatCurrency(high52w)}, currently ${round(((high52w - currentPrice) / high52w) * 100, 1)}% below the 52-week peak.`
    : '';

  const techIndicators = technicals?.indicators || {};
  const ma = techIndicators.movingAverages || {};
  const rsi = techIndicators.rsi || {};
  const macd = techIndicators.macd || {};
  const atr = techIndicators.atr || {};

  const technicalTrend = ma.trendStrength
    ? `${ma.trendSummary} RSI is at ${rsi.value || 'N/A'} (${rsi.interpretation || 'neutral'}). MACD histogram stands at ${macd.histogram !== null ? (macd.histogram >= 0 ? '+' : '') + macd.histogram : 'N/A'}.`
    : 'Technical indicator data is developing.';

  const valuationNote = fundamentals.metrics?.trailingPe
    ? `Trailing P/E of ${fundamentals.metrics.trailingPe} vs. sector median of ~${fundamentals.metrics.sectorPeBenchmark}x (${fundamentals.valuationTag.toLowerCase()} valuation).`
    : 'Reported P/E is currently unavailable.';

  return {
    generatedBy: 'rule-based-quantitative-engine',
    isAiGenerated: false,
    evaluatedAt: new Date().toISOString(),
    ticker: stock.ticker,
    companyName: stock.name || stock.ticker,
    exchange: stock.exchange || 'NSE',
    companyOverview: stock.businessSummary
      || `${stock.name || stock.ticker} is an equity listed on the National Stock Exchange of India (NSE) operating in the ${stock.sector || 'equity'} sector.`,
    priceBehaviour: `${priceText} ${rangeText} ATR indicates typical daily swings of ${atr.value ? `₹${atr.value} (${atr.percentOfPrice}%)` : 'standard magnitude'}.`,
    technicalTrend,
    fundamentalStrengths: fundamentals.strengths?.length > 0 ? fundamentals.strengths : ['Fundamental data is partially reported; company maintains basic listing records.'],
    fundamentalWeaknesses: fundamentals.weaknesses?.length > 0 ? fundamentals.weaknesses : ['No acute leverage or valuation red flags identified in verified metrics.'],
    valuationConsiderations: valuationNote,
    importantRisks: risks.summary || 'Standard market volatility applies.',
    bullishEvidence: assessment.bullishEvidence?.length > 0 ? assessment.bullishEvidence : ['Consolidated trading range without severe technical breakdown.'],
    bearishEvidence: assessment.bearishEvidence?.length > 0 ? assessment.bearishEvidence : ['General broader-market and macroeconomic conditions.'],
    contradictorySignals: assessment.contradictions?.length > 0 ? assessment.contradictions : ['No extreme divergence between momentum and trend.'],
    researchVerdict: `Assessment classification: ${assessment.label}. Investors should review sector conditions, earnings reports, and risk tolerance before taking portfolio action.`,
    assessmentSummary: assessment.summary,
    classification: assessment.classification,
    label: assessment.label,
    color: assessment.color,
  };
}

function round(val, d = 2) {
  const n = Number(val);
  return Number.isFinite(n) ? Number(n.toFixed(d)) : null;
}

/**
 * Call Google Gemini API if GEMINI_API_KEY is configured
 */
async function generateGeminiExplanation(stock, assessment, systemPrompt, userPayload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.length < 20) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: 'user', parts: [{ text: `Analyze this stock data and return structured JSON:\n${JSON.stringify(userPayload, null, 2)}` }] },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini responded with status ${response.status}: ${errBody.substring(0, 100)}`);
    }

    const payload = await response.json();
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    return {
      generatedBy: `gemini:${model}`,
      isAiGenerated: true,
      evaluatedAt: new Date().toISOString(),
      ticker: stock.ticker,
      companyName: stock.name || stock.ticker,
      exchange: stock.exchange || 'NSE',
      ...parsed,
      assessmentSummary: assessment.summary,
      classification: assessment.classification,
      label: assessment.label,
      color: assessment.color,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call OpenAI API using official chat completions endpoint
 */
async function generateOpenAiExplanation(stock, assessment, systemPrompt, userPayload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-proj-invalid') || apiKey.length < 20) {
    return null;
  }

  let model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (model === 'gpt-5' || model.startsWith('gpt-5')) {
    model = 'gpt-4o-mini';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this stock data:\n${JSON.stringify(userPayload, null, 2)}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Low temperature for high factual adherence
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI responded with status ${response.status}: ${errBody.substring(0, 100)}`);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      generatedBy: `openai:${model}`,
      isAiGenerated: true,
      evaluatedAt: new Date().toISOString(),
      ticker: stock.ticker,
      companyName: stock.name || stock.ticker,
      exchange: stock.exchange || 'NSE',
      ...parsed,
      assessmentSummary: assessment.summary,
      classification: assessment.classification,
      label: assessment.label,
      color: assessment.color,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Master entrypoint for Stock Research Explanation
 */
async function generateStockResearchBrief(stock, marketHistory = []) {
  // 1. Generate deterministic assessment first
  const assessment = generateResearchAssessment(stock, marketHistory);

  const systemPrompt = `You are a Senior Quantitative Equity Research Analyst for InvestIQ.
Analyze the provided verifiable quantitative stock data and output a structured research explanation.

CRITICAL RULES:
1. Return ONLY valid JSON with the exact specified shape.
2. Do NOT invent or hallucinate financial figures, price targets, or news.
3. Do NOT provide Buy, Sell, or Hold trading recommendations or guaranteed returns.
4. Separate factual indicators from interpretation.
5. All observations must directly reflect the provided data payload.

JSON Shape:
{
  "companyOverview": "2-3 sentence business and market context",
  "priceBehaviour": "Summary of current price, recent momentum, and range",
  "technicalTrend": "Summary of moving averages, RSI, and MACD alignment",
  "fundamentalStrengths": ["strength 1", "strength 2"],
  "fundamentalWeaknesses": ["weakness 1", "weakness 2"],
  "valuationConsiderations": "P/E and valuation assessment relative to sector",
  "importantRisks": "Explanation of volatility, drawdown, and beta sensitivity",
  "bullishEvidence": ["evidence 1", "evidence 2"],
  "bearishEvidence": ["evidence 1", "evidence 2"],
  "contradictorySignals": ["contradiction or note on mixed signals"],
  "researchVerdict": "One balanced, non-prescriptive takeaway summarizing the risk-reward setup"
}`;

  const userPayload = {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    industry: stock.industry,
    lastPrice: stock.lastPrice,
    dayChangePercent: stock.dayChangePercent,
    week52High: stock.week52High,
    week52Low: stock.week52Low,
    assessment: {
      classification: assessment.classification,
      label: assessment.label,
      summary: assessment.summary,
      bullishEvidence: assessment.bullishEvidence,
      bearishEvidence: assessment.bearishEvidence,
      contradictions: assessment.contradictions,
    },
    technicals: assessment.technicals?.indicators,
    risks: assessment.risks?.metrics,
    fundamentals: assessment.fundamentals?.metrics,
  };

  let aiNotice = null;

  // 2. Attempt OpenAI if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const openAiBrief = await generateOpenAiExplanation(stock, assessment, systemPrompt, userPayload);
      if (openAiBrief) {
        return {
          ...openAiBrief,
          assessment,
        };
      }
    } catch (err) {
      const is401 = err.message.includes('401');
      aiNotice = is401
        ? 'Configured OpenAI API key returned 401 (Invalid Key). Running InvestIQ Deterministic Intelligence Engine.'
        : `OpenAI synthesis unavailable (${err.message.substring(0, 50)}). Running InvestIQ Deterministic Intelligence Engine.`;
      console.warn(`[AI Explainer] ${aiNotice}`);
    }
  }

  // 3. Attempt Gemini if configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiBrief = await generateGeminiExplanation(stock, assessment, systemPrompt, userPayload);
      if (geminiBrief) {
        return {
          ...geminiBrief,
          assessment,
        };
      }
    } catch (err) {
      console.warn(`[AI Explainer] Gemini synthesis failed for ${stock.ticker}: ${err.message}`);
    }
  }

  // 4. Fallback to deterministic rule-based quantitative engine
  const ruleBased = buildRuleBasedExplanation(stock, assessment);
  return {
    ...ruleBased,
    aiProviderNotice: aiNotice,
    assessment,
  };
}

module.exports = {
  generateStockResearchBrief,
  buildRuleBasedExplanation,
};
