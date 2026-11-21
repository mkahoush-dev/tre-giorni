# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js + TypeScript (user choice). App Router; server route holds any LLM API key. Deploy target: Vercel (proposed, not yet confirmed).

## Users

*Inferred from the brief, delegated by the user:* A traveler with exactly 3 days in Italy who wants a realistic, personal plan without researching 100 places themselves. They arrive before the trip, often on a laptop for planning and later on a phone while there. Secondary audience: the take-home reviewers, who judge the decisions behind the product.

## Product Purpose

Turn the curated `italy.json` dataset into a personalized 3-day itinerary the traveler can trust and adjust. Success means the plan is feasible (places open when scheduled, realistic durations and travel, no impossible city-hopping), clearly fits the person's stated interests, and is easy to change.

## Positioning

The plan is honest about uncertainty. The dataset is curated but messy, and the product shows *why* each stop was chosen and *what it isn't sure about* (unknown hours, seasonal closures, booking needed). It doesn't pretend to precision it lacks. Generic AI itinerary tools invent places and hours; this one only uses the dataset and checks every stop against it.

## Operating Context

- Planning happens before the trip; the trip dates determine seasonal validity and weekday closures.
- Italy-specific realities: long lunch closures, Monday museum closures, trains between cities (Rome–Florence ~1.5h, Florence–Venice ~2h, Rome–Venice ~4h).
- Dataset: 103 places, 5 regions, main cities Rome / Florence / Milan / Venice / Bologna, plus day-trip towns.

## Capabilities and Constraints

- `italy.json` is the only source of places; external enrichment (maps, routing) is optional.
- Data quality: 33 null hours, free-text hours ("Evenings", "Morning only", "8am-7pm"), weekday rules and split shifts, 9 null durations, 1 null booking flag, inconsistent tags, seasonal notes with month-limited openings.
- Hybrid AI (user choice): a deterministic planner owns feasibility; an LLM may interpret free-text wishes into structured preferences and write short per-stop rationale, restricted to dataset IDs. The app must stay fully functional without an LLM key.
- Must remain small and readable: the user will extend it live in an interview with minimal AI help.

## Evidence on Hand

- `italy.json` (descriptions, ratings, tags, coordinates, hours, seasonal notes). No images supplied; do not fabricate photos, reviews, or prices beyond the dataset.

## Product Principles

1. Feasible before clever: never schedule a stop the data says is closed.
2. Show the reasoning: every pick explains itself; every uncertainty is visible, not hidden.
3. The traveler stays in control: generated plans are a starting draft, cheap to change.
4. The dataset is the truth: AI may phrase and interpret, never invent places or facts.
5. Fewer cities, deeper days: three days rewards focus over coverage.
