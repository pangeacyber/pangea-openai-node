# Pangea + OpenAI TypeScript API Library

A wrapper around the OpenAI TypeScript library that wraps the [Responses API](https://platform.openai.com/docs/api-reference/responses)
with Pangea AI Guard. Supports Node.js v22 and greater.

## Installation

```bash
npm install @pangeacyber/openai
```

## Usage

```typescript
import { PangeaOpenAI } from "@pangeacyber/openai";

const client = new PangeaOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  pangeaApiKey: process.env.PANGEA_API_KEY,
});

const response = await client.responses.create({
  model: "gpt-4o-mini",
  instructions: "You are a helpful assistant.",
  input: "Are semicolons optional in JavaScript?",
});

console.log(response.output_text);
```
