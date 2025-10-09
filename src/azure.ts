import type { AzureClientOptions } from 'openai/azure';
import * as Errors from 'openai/error';

import { PangeaOpenAI } from './client';
import { buildHeaders } from './internal/headers';
import type { FinalRequestOptions } from './internal/request-options';
import { readEnv } from './internal/utils/env';
import { isObj } from './internal/utils/values';

/** API Client for interfacing with the Azure OpenAI API. */
export class PangeaAzureOpenAI extends PangeaOpenAI {
  deploymentName: string | undefined;
  apiVersion = '';

  /**
   * API Client for interfacing with the Azure OpenAI API.
   *
   * @param {string | undefined} [opts.apiVersion=process.env['OPENAI_API_VERSION'] ?? undefined]
   * @param {string | undefined} [opts.endpoint=process.env['AZURE_OPENAI_ENDPOINT'] ?? undefined] - Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`
   * @param {string | undefined} [opts.apiKey=process.env['AZURE_OPENAI_API_KEY'] ?? undefined]
   * @param {string | undefined} opts.deployment - A model deployment, if given, sets the base client URL to include `/deployments/{deployment}`.
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL']] - Sets the base URL for the API, e.g. `https://example-resource.azure.openai.com/openai/`.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {Headers} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({
    baseURL = readEnv('OPENAI_BASE_URL'),
    apiKey = readEnv('AZURE_OPENAI_API_KEY'),
    apiVersion = readEnv('OPENAI_API_VERSION'),
    endpoint,
    deployment,
    azureADTokenProvider,
    dangerouslyAllowBrowser,
    // Pangea
    pangeaApiKey,
    pangeaInputRecipe,
    pangeaOutputRecipe,
    ...opts
  }: AzureClientOptions & {
    pangeaApiKey?: string;
    pangeaInputRecipe?: string;
    pangeaOutputRecipe?: string;
  } = {}) {
    if (!apiVersion) {
      throw new Errors.OpenAIError(
        "The OPENAI_API_VERSION environment variable is missing or empty; either provide it, or instantiate the AzureOpenAI client with an apiVersion option, like new AzureOpenAI({ apiVersion: 'My API Version' })."
      );
    }

    if (typeof azureADTokenProvider === 'function') {
      dangerouslyAllowBrowser = true;
    }

    if (!(azureADTokenProvider || apiKey)) {
      throw new Errors.OpenAIError(
        'Missing credentials. Please pass one of `apiKey` and `azureADTokenProvider`, or set the `AZURE_OPENAI_API_KEY` environment variable.'
      );
    }

    if (azureADTokenProvider && apiKey) {
      throw new Errors.OpenAIError(
        'The `apiKey` and `azureADTokenProvider` arguments are mutually exclusive; only one can be passed at a time.'
      );
    }

    opts.defaultQuery = { ...opts.defaultQuery, 'api-version': apiVersion };

    if (baseURL) {
      if (endpoint) {
        throw new Errors.OpenAIError(
          'baseURL and endpoint are mutually exclusive'
        );
      }
    } else {
      if (!endpoint) {
        endpoint = process.env['AZURE_OPENAI_ENDPOINT'];
      }

      if (!endpoint) {
        throw new Errors.OpenAIError(
          'Must provide one of the `baseURL` or `endpoint` arguments, or the `AZURE_OPENAI_ENDPOINT` environment variable'
        );
      }

      baseURL = `${endpoint}/openai`;
    }

    super({
      apiKey: azureADTokenProvider ?? apiKey,
      baseURL,
      ...opts,
      ...(dangerouslyAllowBrowser !== undefined
        ? { dangerouslyAllowBrowser }
        : {}),
      pangeaApiKey,
      pangeaInputRecipe,
      pangeaOutputRecipe,
    });

    this.apiVersion = apiVersion;
    this.deploymentName = deployment;
  }

  // biome-ignore lint/suspicious/useAwait: matches upstream.
  override async buildRequest(
    options: FinalRequestOptions,
    props: { retryCount?: number } = {}
  ): Promise<{
    req: RequestInit & { headers: Headers };
    url: string;
    timeout: number;
  }> {
    if (
      _deployments_endpoints.has(options.path) &&
      options.method === 'post' &&
      options.body !== undefined
    ) {
      if (!isObj(options.body)) {
        throw new Error('Expected request body to be an object');
      }
      const model =
        this.deploymentName ||
        options.body['model'] ||
        options.__metadata?.['model'];
      if (model !== undefined && !this.baseURL.includes('/deployments')) {
        options.path = `/deployments/${model}${options.path}`;
      }
    }

    return super.buildRequest(options, props);
  }

  // biome-ignore lint/suspicious/useAwait: matches upstream.
  protected override async authHeaders(opts: FinalRequestOptions) {
    if (typeof this._options.apiKey === 'string') {
      // biome-ignore lint/suspicious/noExplicitAny: can't match upstream's NullableHeaders due to private property.
      return buildHeaders([{ 'api-key': this.apiKey }]) as any;
    }
    return super.authHeaders(opts);
  }
}

const _deployments_endpoints = new Set([
  '/completions',
  '/chat/completions',
  '/embeddings',
  '/audio/transcriptions',
  '/audio/translations',
  '/audio/speech',
  '/images/generations',
  '/batches',
  '/images/edits',
]);
