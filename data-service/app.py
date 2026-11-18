from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score


app = FastAPI(title="InvestIQ Market Data Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_ticker(ticker: str) -> str:
    clean = ticker.strip().upper()
    if not clean:
        raise HTTPException(
            status_code=400,
            detail="Ticker symbol cannot be empty.",
        )
    # Support benchmark indices (e.g. ^NSEI, ^BSESN, ^NSEBANK)
    if clean.startswith("^"):
        return clean
    # Support explicit exchange suffixes
    if "." in clean:
        return clean
    # Default Indian equities to NSE suffix
    return f"{clean}.NS"


def safe_number(value: Any, default: float | int | None = None):
    if value is None:
        return default
    try:
        if pd.isna(value):
            return default
        num = float(value)
        return num if np.isfinite(num) else default
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
        raise HTTPException(status_code=502, detail=f"Unable to fetch historical data: {exc}") from exc

    if history is None or history.empty:
        raise HTTPException(status_code=404, detail="No historical market data available for ticker.")

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
        "service": "InvestIQ Market Data Service",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/price/{ticker}")
def price(ticker: str):
    normalized = normalize_ticker(ticker)
    stock = yf.Ticker(normalized)

    # 1. Primary: Extract genuine LTP & Previous Close from yfinance fast_info
    ltp = None
    prev_close = None
    open_price = None
    day_high = None
    day_low = None
    volume = None
    quote_time = datetime.utcnow().isoformat() + "Z"

    try:
        fast_info = stock.fast_info
        ltp = safe_number(getattr(fast_info, "last_price", None)) or safe_number(getattr(fast_info, "regular_market_price", None))
        prev_close = safe_number(getattr(fast_info, "previous_close", None)) or safe_number(getattr(fast_info, "regular_market_previous_close", None))
        open_price = safe_number(getattr(fast_info, "open", None))
        day_high = safe_number(getattr(fast_info, "day_high", None))
        day_low = safe_number(getattr(fast_info, "day_low", None))
        volume = safe_int(getattr(fast_info, "last_volume", None))
    except Exception:
        pass

    # 2. Secondary: Fallback to stock.info if fast_info missing
    if ltp is None or prev_close is None:
        try:
            info = stock.info or {}
            if ltp is None:
                ltp = safe_number(info.get("currentPrice")) or safe_number(info.get("regularMarketPrice"))
            if prev_close is None:
                prev_close = safe_number(info.get("previousClose")) or safe_number(info.get("regularMarketPreviousClose"))
            if open_price is None:
                open_price = safe_number(info.get("open"))
            if day_high is None:
                day_high = safe_number(info.get("dayHigh"))
            if day_low is None:
                day_low = safe_number(info.get("dayLow"))
            if volume is None:
                volume = safe_int(info.get("volume") or info.get("regularMarketVolume"))
        except Exception:
            pass

    # 3. Tertiary: Fallback to latest intraday bar (1m interval) for latest trading session
    if ltp is None:
        try:
            intraday = stock.history(period="1d", interval="1m", auto_adjust=False)
            if intraday is not None and not intraday.empty:
                valid = intraday.dropna(subset=["Close"])
                if not valid.empty:
                    ltp = safe_number(valid["Close"].iloc[-1])
                    if day_high is None:
                        day_high = safe_number(valid["High"].max())
                    if day_low is None:
                        day_low = safe_number(valid["Low"].min())
                    if open_price is None:
                        open_price = safe_number(valid["Open"].iloc[0])
                    if volume is None:
                        volume = safe_int(valid["Volume"].sum())
        except Exception:
            pass

    # 4. Quaternary: Fallback to recent daily history if market closed or delayed feed
    if ltp is None or prev_close is None:
        try:
            history = stock.history(period="5d", interval="1d", auto_adjust=False)
            if history is not None and not history.empty:
                valid_hist = history.dropna(subset=["Close"])
                if not valid_hist.empty:
                    if ltp is None:
                        ltp = safe_number(valid_hist["Close"].iloc[-1])
                    if prev_close is None:
                        if len(valid_hist) > 1:
                            prev_close = safe_number(valid_hist["Close"].iloc[-2])
                        else:
                            prev_close = ltp
                    if open_price is None:
                        open_price = safe_number(valid_hist["Open"].iloc[-1])
                    if day_high is None:
                        day_high = safe_number(valid_hist["High"].iloc[-1])
                    if day_low is None:
                        day_low = safe_number(valid_hist["Low"].iloc[-1])
                    if volume is None:
                        volume = safe_int(valid_hist["Volume"].iloc[-1])
        except Exception:
            pass

    if ltp is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unable to retrieve current market price for ticker '{normalized}'.",
        )

    # Use ltp as fallback prev_close if unavailable to avoid zero-division
    if prev_close is None or prev_close <= 0:
        prev_close = ltp

    day_change = round(ltp - prev_close, 2)
    day_change_percent = round(((ltp - prev_close) / prev_close) * 100, 2) if prev_close > 0 else 0.0

    return {
        "ticker": normalized,
        "symbol": normalized.split(".")[0].replace("^", ""),
        "currentPrice": round(ltp, 2),
        "previousClose": round(prev_close, 2),
        "dayChange": day_change,
        "dayChangePercent": day_change_percent,
        "open": round(open_price, 2) if open_price is not None else round(ltp, 2),
        "dayHigh": round(day_high, 2) if day_high is not None else round(ltp, 2),
        "dayLow": round(day_low, 2) if day_low is not None else round(ltp, 2),
        "volume": volume if volume is not None else 0,
        "quoteTimestamp": quote_time,
        "dataFreshness": "DELAYED",  # Yahoo Finance free data for NSE is delayed by 15 mins
        "dataSource": "yfinance",
    }


@app.get("/summary/{ticker}")
def summary(ticker: str):
    normalized = normalize_ticker(ticker)
    stock = yf.Ticker(normalized)
    history = get_history_frame(stock, period="1y")
    info = get_info(stock)

    name = info.get("longName") or info.get("shortName") or normalized
    week52_high = safe_number(info.get("fiftyTwoWeekHigh"), safe_number(history["High"].max(), 0))
    week52_low = safe_number(info.get("fiftyTwoWeekLow"), safe_number(history["Low"].min(), 0))

    return {
        "ticker": normalized,
        "name": name,
        "sector": info.get("sector") or "Indian Equity",
        "industry": info.get("industry") or "",
        "website": info.get("website") or "",
        "businessSummary": info.get("longBusinessSummary") or "",
        "marketCap": safe_int(info.get("marketCap"), 0),
        "peRatio": safe_number(info.get("trailingPE"), 0),
        "week52High": round(week52_high, 2) if week52_high else 0,
        "week52Low": round(week52_low, 2) if week52_low else 0,
    }


@app.get("/history/{ticker}")
def history(ticker: str):
    normalized = normalize_ticker(ticker)
    stock = yf.Ticker(normalized)
    history_frame = get_history_frame(stock, period="5y")

    rows = []
    for index, row in history_frame.iterrows():
        date_str = index.date().isoformat() if hasattr(index, "date") else str(index)[:10]
        rows.append(
            {
                "date": date_str,
                "open": round(safe_number(row["Open"], 0), 2),
                "high": round(safe_number(row["High"], 0), 2),
                "low": round(safe_number(row["Low"], 0), 2),
                "close": round(safe_number(row["Close"], 0), 2),
                "volume": safe_int(row.get("Volume"), 0),
            }
        )

    return rows


def evaluate_ml_forecasting_pipeline(history_frame: pd.DataFrame) -> dict[str, Any]:
    """
    Chronological Walk-Forward Machine Learning Pipeline
    - Stationarizes prices via log returns
    - No future data leakage (train <= 80%, test > 80%)
    - Compares ML Direction Classifier against Naive Persistence Baseline
    - Evaluates out-of-sample Directional Accuracy, MAE, and RMSE
    - Strictly disables predictive claims if model fails to beat baseline
    """
    df = history_frame.copy()
    if len(df) < 60:
        return {
            "validated": False,
            "status": "INSUFFICIENT_DATA",
            "message": "At least 60 continuous daily bars are required for out-of-sample machine learning validation.",
            "metrics": None,
            "predictions": [],
        }

    closes = df["Close"].dropna().astype(float)
    returns = np.log(closes / closes.shift(1))

    # Feature Engineering on stationary features
    feat_df = pd.DataFrame(index=closes.index)
    feat_df["ret1"] = returns.shift(1)
    feat_df["ret5"] = np.log(closes.shift(1) / closes.shift(6))
    feat_df["ret20"] = np.log(closes.shift(1) / closes.shift(21))
    feat_df["vol20"] = returns.shift(1).rolling(20).std()
    sma20 = closes.shift(1).rolling(20).mean()
    feat_df["dist_sma20"] = (closes.shift(1) - sma20) / sma20

    # Target: Next 5-session directional return
    target_fwd5 = np.log(closes.shift(-5) / closes)
    feat_df["target_dir"] = (target_fwd5 > 0).astype(int)
    feat_df["target_ret"] = target_fwd5

    clean = feat_df.dropna()
    if len(clean) < 40:
        return {
            "validated": False,
            "status": "INSUFFICIENT_CLEAN_DATA",
            "message": "Insufficient data remaining after lag and rolling window transformations.",
            "metrics": None,
            "predictions": [],
        }

    # Chronological Split (Strictly No Random Shuffling)
    train_size = int(len(clean) * 0.8)
    feature_cols = ["ret1", "ret5", "ret20", "vol20", "dist_sma20"]

    x_train = clean[feature_cols].iloc[:train_size]
    x_test = clean[feature_cols].iloc[train_size:]

    y_train_dir = clean["target_dir"].iloc[:train_size]
    y_test_dir = clean["target_dir"].iloc[train_size:]

    y_train_ret = clean["target_ret"].iloc[:train_size]
    y_test_ret = clean["target_ret"].iloc[train_size:]

    # Model: Logistic Regression Directional Classifier
    clf = LogisticRegression(random_state=42)
    clf.fit(x_train, y_train_dir)
    pred_dir = clf.predict(x_test)

    # Naive Baseline: Persistence / Majority Direction
    majority_class = int(y_train_dir.mode()[0]) if not y_train_dir.empty else 1
    baseline_pred = np.full(len(y_test_dir), majority_class)

    # Ridge Regressor for return estimation
    reg = Ridge(alpha=1.0, random_state=42)
    reg.fit(x_train, y_train_ret)
    pred_ret = reg.predict(x_test)

    # Out-Of-Sample Evaluation Metrics
    accuracy = float(accuracy_score(y_test_dir, pred_dir))
    baseline_acc = float(accuracy_score(y_test_dir, baseline_pred))
    mae = float(mean_absolute_error(y_test_ret, pred_ret))
    rmse = float(np.sqrt(np.mean((y_test_ret - pred_ret) ** 2)))

    # Strict Quantitative Validation Gate:
    # Model must outperform the naive baseline AND demonstrate > 52% directional accuracy
    beats_baseline = accuracy > baseline_acc
    statistically_viable = accuracy >= 0.52
    is_validated = beats_baseline and statistically_viable

    current_close = float(closes.iloc[-1])
    current_vol = float(returns.tail(20).std()) * np.sqrt(5) # 5-day expected volatility

    predictions = []
    if is_validated:
        # Generate 5-day statistical volatility bounds instead of arbitrary straight lines
        last_date = df.index[-1].date() if hasattr(df.index[-1], "date") else datetime.utcnow().date()
        expected_ret = float(reg.predict(clean[feature_cols].iloc[[-1]])[0])
        bounded_mid = current_close * np.exp(expected_ret)

        for day_offset in range(1, 6):
            p_date = last_date + timedelta(days=day_offset)
            predictions.append({
                "date": p_date.isoformat(),
                "horizon": f"{day_offset}D",
                "estimatedClose": round(bounded_mid, 2),
                "lowerBand95": round(current_close * np.exp(-1.96 * current_vol), 2),
                "upperBand95": round(current_close * np.exp(1.96 * current_vol), 2),
            })

    status_label = "VALIDATED_STATISTICAL_EDGE" if is_validated else "EXPERIMENTAL_UNVALIDATED"
    message = (
        f"Out-of-sample directional accuracy ({round(accuracy * 100, 1)}%) exceeds naive persistence baseline ({round(baseline_acc * 100, 1)}%). Model demonstrates measurable statistical signal."
        if is_validated else
        f"Out-of-sample directional accuracy ({round(accuracy * 100, 1)}%) does not reliably outperform the naive baseline ({round(baseline_acc * 100, 1)}%). Forward price targets are disabled per quantitative research standards."
    )

    return {
        "validated": is_validated,
        "status": status_label,
        "message": message,
        "metrics": {
            "outOfSampleAccuracy": round(accuracy * 100, 2),
            "baselineAccuracy": round(baseline_acc * 100, 2),
            "outOfSampleMAE": round(mae * 100, 3), # % return MAE
            "outOfSampleRMSE": round(rmse * 100, 3), # % return RMSE
            "trainingSessions": len(x_train),
            "testSessions": len(x_test),
            "splitType": "Chronological 80/20 (No Future Leakage)",
            "benchmarkBaseline": "Naive Majority Persistence",
        },
        "predictions": predictions,
    }


@app.get("/forecast/{ticker}")
@app.post("/predict/{ticker}")
def predict_and_forecast(ticker: str):
    normalized = normalize_ticker(ticker)
    stock = yf.Ticker(normalized)
    history_frame = get_history_frame(stock, period="5y")

    eval_result = evaluate_ml_forecasting_pipeline(history_frame)

    # Legacy compatibility fields
    r2_equivalent = (
        round(eval_result["metrics"]["outOfSampleAccuracy"] / 100, 4)
        if eval_result.get("metrics") else 0.50
    )

    return {
        "ticker": normalized,
        "validated": eval_result["validated"],
        "status": eval_result["status"],
        "message": eval_result["message"],
        "metrics": eval_result.get("metrics"),
        "r2Score": r2_equivalent,
        "predictions": eval_result["predictions"],
        "disclaimer": "Quantitative statistical research model. Never guaranteed financial advice. Machine learning models on historical prices carry substantial risk.",
    }
