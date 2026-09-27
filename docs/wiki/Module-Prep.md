# Module: Prep ("Today's Prep")

ITCHATHON Challenge 4. One prep number per item that a shift lead can act on at 7am. Code: `app/modules/prep.js`. Routes: `POST /api/prep/forecast` (pure math, no LLM) and `POST /api/prep/explain` (optional `claude -p` polish with a template fallback). Eval: `evals/prep/backtest.py`.

## The habit to beat

"Same weekday last week." It is what the owner actually does, so it is the baseline the module is scored against. The module has to beat it by at least 15% or it does not ship.

![Naive (same-weekday-last-week) vs model pinball loss, run-out and neutral quantiles](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/charts/prep-backtest.png)

## Input

```json
{
  "items": [{ "name": "Croissant", "history": [{ "date": "2026-09-01", "sold": 44 }, ...], "walk_in": true, "typical_bookings": 30 }],
  "preference": "run_out | neutral | waste",
  "context": { "bookings": 42, "typical_bookings": 30, "events": ["street fair"], "weather": "rain" },
  "target_date": "2026-09-28"
}
```

`preference` says which mistake is worse for this owner: `run_out` (would rather have leftovers) or `waste` (would rather sell out). `target_date` defaults to the day after the last history row.

## The math

All constants are at the top of `prep.js`:

```js
const WEEKS_BACK = 8;              // same-weekday samples used
const TREND_MIN = 0.8, TREND_MAX = 1.25;
const QUANTILE_BY_PREF = { run_out: 0.65, neutral: 0.5, waste: 0.40 };
const RANGE_LOW_Q = 0.25, RANGE_HIGH_Q = 0.80;
const EVENT_MULT = 1.15;
const RAIN_MULT = 0.90;
```

For each item:

1. Take the last 8 same-weekday sales values (all rows if there are none). Dates are parsed as UTC days so weekday math is timezone-proof.
2. `base` = the quantile of that sample chosen by the preference (0.65 for run_out, 0.5 neutral, 0.40 waste). Linear interpolation, numpy default / R type 7.
3. `trend` = mean(last 14 days) / mean(previous 14 days), clamped to 0.8–1.25, only when both windows have ≥ 7 rows.
4. Context multipliers: bookings above `typical_bookings` add half-weight, capped at +50%; any event adds 15%; rain trims walk-in items by 10%.
5. `prep_qty = round(base × trend × context)`; `range = [q0.25, q0.80] × the same multiplier`, clamped around `prep_qty`.
6. `why` is one sentence naming the drivers, for example: `Saturdays median 46, trending up 8%, 42 bookings vs a usual 30 adds 20%, you prefer not to run out.`

## Output

```json
{
  "preference": "run_out", "target_date": "2026-09-28", "weekday": "Monday",
  "items": [{ "name": "Croissant", "prep_qty": 52, "range": [44, 58], "why": "...",
              "_meta": { "weekday": "Monday", "target_date": "2026-09-28", "samples": 8, "median": 46, "quantile": 0.65, "trend": 1.08, "context_mult": 1.2 } }],
  "latency_ms": 1
}
```

## The 7am card

`POST /api/prep/explain` accepts either the forecast result or the raw request. It asks the model (`PREP_MODEL`, default `sonnet`) for exactly three lines, under 300 characters, no markdown: the day and every item with its number; the single most important driver; which way to lean. If the CLI fails or returns fewer than two lines, `templateCard()` produces the same three lines from the forecast, and the response says `source: "template"`. Nothing the owner sees depends on the model succeeding.

## Eval: pinball loss backtest

`python3 evals/prep/backtest.py` builds 12 weeks of synthetic POS sales for 6 items (weekday seasonality, growth, Gaussian noise, one street-fair spike on 2026-08-14), holds out the last 14 days, and forecasts each holdout day using only earlier data. Both the naive rule and the model are scored with pinball loss at tau = 0.65 and tau = 0.5.

Pinball loss is the right yardstick because the prep number is a quantile decision, not a point guess: it charges tau per unit of under-prep (lost sales) and (1 − tau) per unit of over-prep (waste), so the owner's stated preference sets the exchange rate between the two mistakes. A plain MAE would reward hedging toward the middle.

Results (`evals/prep/results.json`, seed 7, 84 days, holdout 14):

| | naive | model | improvement |
|---|---|---|---|
| run_out (tau 0.65) | 4.2327 | 2.8524 | 32.6% |
| neutral (tau 0.5) | 4.0417 | 2.9107 | 28.0% |
| **averaged** | **4.1372** | **2.8815** | **30.35%** |

Gate ≥ 15%: met. Per item (run_out): Croissant 9.30 → 4.98, Sourdough 2.43 → 1.64, Cinnamon roll 5.75 → 4.66, Quiche 2.83 → 2.16, Soup 2.21 → 2.01, Baguette 2.88 → 1.67. The smallest gain is on the flattest item (soup). `node_parity: ok (18 item x preference forecasts identical)`: the Python re-implementation is cross-checked against the real Node module and the script refuses to report if they disagree (`--no-node` skips the check).

## Limits

The backtest is synthetic; the dashboard's 7-day prepared-vs-sold series is a deterministic demo because no POS feed is wired. Both are labelled as such in the code and in `/api/dashboard/summary` (`sources.prep_series: "demo"`). Connecting a POS export is on the [Roadmap](Roadmap.md).
