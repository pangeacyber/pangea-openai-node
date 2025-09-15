import { type ClientOptions, OpenAI } from 'openai';
import type * as API from 'openai/resources';
import { AIGuardService, PangeaConfig } from 'pangea-node-sdk';

import * as Errors from './core/error.js';
import { readEnv } from './internal/utils/env.js';
import { PangeaResponses } from './resources/responses/responses.js';

export class PangeaOpenAI extends OpenAI {
  readonly aiGuardClient: AIGuardService;
  readonly pangeaInputRecipe: string | undefined;
  readonly pangeaOutputRecipe: string | undefined;

  constructor({
    baseURL = readEnv('OPENAI_BASE_URL'),
    apiKey = readEnv('OPENAI_API_KEY'),
    organization = readEnv('OPENAI_ORG_ID') ?? null,
    project = readEnv('OPENAI_PROJECT_ID') ?? null,
    webhookSecret = readEnv('OPENAI_WEBHOOK_SECRET') ?? null,
    pangeaApiKey,
    pangeaInputRecipe,
    pangeaOutputRecipe,
    ...opts
  }: ClientOptions & {
    pangeaApiKey?: string;
    pangeaInputRecipe?: string;
    pangeaOutputRecipe?: string;
  } = {}) {
    if (!pangeaApiKey) {
      throw new Errors.PangeaError(
        'Missing credentials. Please pass a `pangeaApiKey`.'
      );
    }

    super({
      baseURL,
      apiKey,
      organization,
      project,
      webhookSecret,
      ...opts,
    });

    this.aiGuardClient = new AIGuardService(pangeaApiKey, new PangeaConfig());
    this.pangeaInputRecipe = pangeaInputRecipe;
    this.pangeaOutputRecipe = pangeaOutputRecipe;
  }

  responses: API.Responses = new PangeaResponses(this);
}
