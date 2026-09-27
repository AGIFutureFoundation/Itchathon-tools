# Today's Prep backtest

`python3 backtest.py` builds 12 weeks of synthetic POS sales for 6 items (weekday seasonality, growth, Gaussian noise, one street-fair spike), holds out the last 14 days, and forecasts each holdout day using only earlier data.
Baseline is the owner's real-world habit: **same weekday last week**. The model is the exact math in `app/modules/prep.js` (same-weekday quantile over the last 8 weeks, times a 2-week trend clamped to 0.8–1.25); the script cross-checks its Python copy against the Node module and refuses to report if they disagree.
Both are scored with **pinball loss** at tau = 0.65 (owner prefers not to run out) and tau = 0.5 (neutral, the median).
Pinball loss is the right yardstick because the prep number is a quantile decision, not a point guess: it charges tau per unit of under-prep (lost sales) and (1 - tau) per unit of over-prep (waste), so the owner's stated preference sets the exchange rate between the two mistakes.
A plain MAE would reward hedging toward the middle and could not tell whether a "run out" forecast actually leaned the right way.
Output: a per-item table on stdout and `results.json` with `naive_pinball`, `model_pinball`, `improvement_pct` (averaged over both quantiles) and `gate_met` (improvement >= 15%).
Latest run: naive 4.14 vs model 2.88, improvement 30.4%, gate met; the model beat the naive rule on every item, with the smallest gain on the flattest item (soup, ~5-9%).
Pass `--no-node` to skip the parity check when Node is not installed.
