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

### Azure OpenAI

To use this library with [Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/overview),
use the `PangeaOpenAI` class with an Azure base URL.

```typescript
import { PangeaOpenAI } from "@pangeacyber/openai";

const client = new PangeaOpenAI({
  baseURL: "https://YOUR-RESOURCE-NAME.openai.azure.com/openai/v1/",
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  pangeaApiKey: process.env.PANGEA_API_KEY,
});

const response = await client.responses.create({
  model: "gpt-4o-mini",
  instructions: "You are a helpful assistant.",
  input: "Are semicolons optional in JavaScript?",
});

console.log(response.output_text);
```
