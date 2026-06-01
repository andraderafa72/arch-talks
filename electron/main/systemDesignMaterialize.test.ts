import assert from "node:assert/strict";
import test from "node:test";
import {
  MATERIALIZE_FILE_MARKERS,
  parseAndValidateSuggestionsMd,
  parseAndValidateSystemMd,
  splitMaterializeReply,
} from "./systemDesignMaterialize.ts";

const validSystemMd = `# System: Billing App
## Overview
This system manages invoices, payments, customers, and notifications for a billing workflow.
It coordinates customer-facing actions and back-office operations.

## Actors & users
- Customer
- Finance operator

## External systems
- Payment provider

## Core capabilities
- Invoice management
- Payment capture

## Modules
- billing
- auth

## Data & persistence
- Invoices, payments, users, and audit logs.

## Key flows
- Customer pays an invoice and receives confirmation.

## Constraints & NFRs
- Payments must be traceable and idempotent.

## Technology
- Web application and API.

## Open questions
- Settlement timing.`;

test("splitMaterializeReply extracts both file blocks", () => {
  const reply = `${MATERIALIZE_FILE_MARKERS.systemMd}
${validSystemMd}

${MATERIALIZE_FILE_MARKERS.suggestionsMd}
# Diagram suggestions

Layout: small

## diagrams/
| File | Type | Status | Summary |
|------|------|--------|---------|
| block.puml | block | existing | System block overview |`;

  assert.deepEqual(splitMaterializeReply(reply), {
    systemMd: validSystemMd,
    suggestionsMd: `# Diagram suggestions

Layout: small

## diagrams/
| File | Type | Status | Summary |
|------|------|--------|---------|
| block.puml | block | existing | System block overview |`,
  });
});

test("splitMaterializeReply rejects conversational preamble", () => {
  assert.throws(
    () => splitMaterializeReply(`Here you go\n${MATERIALIZE_FILE_MARKERS.systemMd}\n# System: X`),
    /must start/,
  );
});

test("parseAndValidateSystemMd rejects short greetings", () => {
  assert.throws(() => parseAndValidateSystemMd("Hello, I will create that now."), /missing/);
});

test("parseAndValidateSystemMd accepts a complete document", () => {
  assert.equal(parseAndValidateSystemMd(validSystemMd), validSystemMd);
});

test("parseAndValidateSuggestionsMd rejects PlantUML source", () => {
  assert.throws(
    () =>
      parseAndValidateSuggestionsMd(`# Diagram suggestions

Layout: small

## diagrams/
| block.puml | block | suggested | Overview |

@startuml
@enduml`),
    /must not contain PlantUML/,
  );
});

test("parseAndValidateSuggestionsMd rejects type folders", () => {
  assert.throws(
    () =>
      parseAndValidateSuggestionsMd(`# Diagram suggestions

Layout: large

## diagrams/activity/
| File | Type | Status | Summary |
|------|------|--------|---------|
| billing.puml | activity | suggested | Billing activity |`),
    /invalid diagram section/,
  );
});

test("parseAndValidateSuggestionsMd accepts large module suggestions", () => {
  const md = `# Diagram suggestions

Layout: large

## diagrams/modules/billing/
| File | Type | Status | Summary |
|------|------|--------|---------|
| block.puml | block | suggested | Billing components |
| sequence.puml | sequence | suggested | Payment capture |`;
  assert.equal(parseAndValidateSuggestionsMd(md), md);
});
