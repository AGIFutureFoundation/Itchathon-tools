# Module: Theft ("Ten Seconds After")

ITCHATHON Challenge 3: theft in a one-person shop. Cameras and video analytics (Veesion and the like) already detect. This module owns the ten seconds **after** the alert: what one person on the floor does, for a $10–$20 item, without confrontation. Deterministic rules table, no LLM, Node built-ins only. Code: `app/modules/theft.js`.

![Theft module: the ten-second script and countdown ring](https://raw.githubusercontent.com/AGIFutureFoundation/Itchathon-tools/main/media/screenshots/dark/theft.png)

## Why no model

From `docs/ARCHITECTURE.md`: the answer has to arrive in under a second, be identical every time for the same alert, and never contain a sentence a lawyer would not sign off. A rules table gives all three. The LLM belongs where the input is messy prose, not where the input is four fields from a camera.

## The hard rules

Every response carries the same four lines, and no playbook can omit them:

```js
const NEVER_DO = [
  'do not confront or accuse',
  'do not chase or follow out of the shop',
  'do not touch the person or their bag',
  'do not block the exit',
];
```

The scripts are ordinary customer-service sentences that also signal "I have seen you":

```js
greeting_generic: 'Hi there, let me know if you need a size or a hand with anything.',
greeting_repeat:  'Hi, good to see you again, shout if you need anything.',
till_offer:       'I am just at the till whenever you are ready, I can pop that in a bag for you.',
two_staff:        'Hi there, my colleague is just over there if you need a hand with anything.',
```

## The playbook (`choosePlaybook`)

Pure function: same alert → same answer. Two switches decide the branch: `alone = staff_on_floor ≤ 1` and `lowValue = item_value_estimate < 25`.

| Alone | Low value | Primary action | Secondary | Channel |
|---|---|---|---|---|
| yes | yes (the core case) | Greet toward the zone so the person knows they have been seen, then move to the till and stay there | Switch the till screen to the "customer service" slide (a friendly face, not a warning) | speaker |
| yes | no | Greet toward the zone, offer to hold the item at the till, and stay at the till | Call a second person (neighbouring shop, partner, landlord contact) to be visible for ten minutes | phone |
| no | yes | One person greets in the zone; the other stays at the till and stays visible | Keep both in the person's line of sight; no one moves toward the exit | screen |
| no | no | One person greets and offers to carry the item to the till; the other stays at the till | Second person notes the time and description now so the report bundle is ready | till |

Follow-ups are added by flags: repeat visitor → "note for next visit: greet by the door"; higher value → "call a second person / log for police report bundle"; camera or Veesion source → "mark the clip so it is kept with the log entry". `timing_seconds` is always 10.

## Routes

| Route | Body | Returns |
|---|---|---|
| `POST /api/theft/alert` | `{ source: "veesion|camera|manual", zone, item_value_estimate, staff_on_floor (required), repeat_visitor, person_description? }` | `{ action: { primary, secondary, do_not, followups }, script, channel, timing_seconds, log_id, context }` |
| `POST /api/theft/log` | `{ log_id, zone, value, action_taken, outcome: "deterred|took_it|unsure" }` | `{ ok, row }` |
| `GET /api/theft/summary` | — | alerts, outcomes, deterrence_rate, estimated_loss, by_zone, by_week (ISO weeks), top_zone, decision_hint |
| `POST /api/theft/harden` | `{ items: [{ name, price, zone, thefts_30d }] }` | items ranked by thefts × price, one cheap measure each, total_loss_30d |

## What is and is not stored

`alert()` appends to `data/theft_log.jsonl`: `ts, log_id, kind: "alert", zone, value, source, repeat_visitor, action_taken`. The `person_description` field is used for the live playbook and **never written to disk**; the code comment says why: it is for the person on the floor right now, not for a record. Outcomes are appended as `kind: "outcome"` rows. `retention.js` keeps theft rows 365 days and blanks any `person_description` field found in `data/theft/*.jsonl` after 24 hours as a second line of defence.

## The monthly question

`summary()` groups outcomes by zone and by ISO week and produces a `decision_hint`:

```js
top_zone && top_zone.took_it >= 3
  ? `${top_zone.zone} lost ${top_zone.took_it} items this period; worth moving that shelf within sight of the till.`
  : 'Not enough losses in one zone yet to justify changing the layout.'
```

`harden()` picks one measure per item from a fixed list ordered from most to least intrusive: move behind the counter (≥ 6 thefts, or ≥ 3 at ≥ $15), dummy display box (≥ 4 at ≥ $10), security tag (≥ 3 at ≥ $12), move within sight of the till (≥ 2), raise the price by the shrink percentage (always available). Everything is ranked by `thefts_30d × price`.

## Demo beat

From `docs/PITCH_NOTES.md`: Veesion flags the beauty aisle, $10 item, one person on the floor, repeat visitor. The screen fills with one sentence in 42pt type and a ten-second ring. No model, no delay, no accusation. Log "deterred". The monthly table updates: is it worth moving that shelf?

## Compliance notes

No video, no images, no facial recognition, no biometrics, so the module stays out of BIPA, GDPR Art. 9 and the EU AI Act's biometric categories. Signage and lawful basis for the camera are the store's responsibility. Scripts are limited to customer-service approaches, in line with OSHA workplace-violence guidance for retail. Details in [Compliance](Compliance.md) and `docs/COMPLIANCE.md` section 3.
