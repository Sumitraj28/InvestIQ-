import os
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score


app = FastAPI(title="InvestIQ Data Service")

# CORS configuration for production
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
if ALLOWED_ORIGINS == ["*"]:
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_ticker(ticker: str) -> str:
    clean = ticker.strip().upper()
    if not clean:
        raise HTTPException(status_code=400, detail="Ticker is required")
    # Allow both RELIANCE and RELIANCE.NS formats
    if "." not in clean:
        clean = f"{clean}.NS"
    return clean


def safe_number(value: Any, default: float | int | None = None):
    if value is None:
        return default
    try:
        if pd.isna(value):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int | None = None):
    number = safe_number(value, default)
    if number is None:
        return default
    return int(number)


def get_ticker(ticker: str) -> yf.Ticker:
    return yf.Ticker(normalize_ticker(ticker))


def get_history_frame(stock: yf.Ticker, period: str = "5y") -> pd.DataFrame:
    try:
        history = stock.history(period=period, interval="1d", auto_adjust=False)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch ticker data: {exc}") from exc

    if history is None or history.empty:
        raise HTTPException(status_code=404, detail="Ticker not found or no market data available.")

    return history.dropna(subset=["Open", "High", "Low", "Close"], how="any")


def get_info(stock: yf.Ticker) -> dict[str, Any]:
    try:
        info = stock.info or {}
    except Exception:
        info = {}
    return info


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "InvestIQ Data Service",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/price/{ticker}")
def price(ticker: str):
    try:
        stock = get_ticker(ticker)
        history = get_history_frame(stock, period="5d")

        last_close = safe_number(history["Close"].iloc[-1], 0)
        previous_close = safe_number(history["Close"].iloc[-2], last_close) if len(history) > 1 else last_close

        day_change_percent = 0
        if previous_close:
            day_change_percent = ((last_close - previous_close) / previous_close) * 100

        return {
            "ticker": normalize_ticker(ticker),
            "currentPrice": round(last_close, 2),
            "dayChangePercent": round(day_change_percent, 2),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Price fetch failed: {exc}") from exc


@app.get("/summary/{ticker}")
def summary(ticker: str):
    try:
        stock = get_ticker(ticker)
        history = get_history_frame(stock, period="1y")
        info = get_info(stock)

        name = info.get("longName") or info.get("shortName") or normalize_ticker(ticker)
        week52_high = safe_number(info.get("fiftyTwoWeekHigh"), safe_number(history["High"].max(), 0))
        week52_low = safe_number(info.get("fiftyTwoWeekLow"), safe_number(history["Low"].min(), 0))

        return {
            "ticker": normalize_ticker(ticker),
            "name": name,
            "sector": info.get("sector") or "Unknown",
            "industry": info.get("industry") or "",
            "website": info.get("website") or "",
            "businessSummary": info.get("longBusinessSummary") or "",
            "marketCap": safe_int(info.get("marketCap"), 0),
            "peRatio": safe_number(info.get("trailingPE"), 0),
            "week52High": round(week52_high, 2) if week52_high else 0,
            "week52Low": round(week52_low, 2) if week52_low else 0,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Summary fetch failed: {exc}") from exc


@app.get("/history/{ticker}")
def history(ticker: str):
    try:
        stock = get_ticker(ticker)
        history_frame = get_history_frame(stock, period="5y")

        rows = []
        for index, row in history_frame.iterrows():
            rows.append(
                {
                    "date": index.date().isoformat(),
                    "open": round(safe_number(row["Open"], 0), 2),
                    "high": round(safe_number(row["High"], 0), 2),
                    "low": round(safe_number(row["Low"], 0), 2),
                    "close": round(safe_number(row["Close"], 0), 2),
                    "volume": safe_int(row.get("Volume"), 0),
                }
            )

        return rows
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"History fetch failed: {exc}") from exc


@app.post("/predict/{ticker}")
def predict(ticker: str):
    try:
        stock = get_ticker(ticker)
        history_frame = get_history_frame(stock, period="5y")
        closes = history_frame["Close"].dropna().astype(float)

        if len(closes) < 30:
            raise HTTPException(status_code=422, detail="At least 30 closing prices are required for prediction.")

        x = np.arange(len(closes)).reshape(-1, 1)
        y = closes.to_numpy()

        model = LinearRegression()
        model.fit(x, y)

        fitted = model.predict(x)
        score = r2_score(y, fitted)

        last_date = history_frame.index[-1].date()
        future_x = np.arange(len(closes), len(closes) + 90).reshape(-1, 1)
        future_predictions = model.predict(future_x)

        predictions = []
        for offset, predicted_close in enumerate(future_predictions, start=1):
            prediction_date = last_date + timedelta(days=offset)
            pred_value = max(float(predicted_close), 0)
            predictions.append(
                {
                    "date": prediction_date.isoformat(),
                    "predictedClose": round(pred_value, 2),
                }
            )

        return {
            "ticker": normalize_ticker(ticker),
            "r2Score": round(float(score), 4),
            "model": "LinearRegression",
            "horizonDays": 90,
            "predictions": predictions,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Prediction failed: {exc}") from exc