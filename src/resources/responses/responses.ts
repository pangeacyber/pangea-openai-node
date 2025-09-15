import type { APIPromise, OpenAI } from 'openai';
import { Responses } from 'openai/resources';
import type {
  Response,
  ResponseCreateParams,
  ResponseCreateParamsBase,
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses';
import type { Stream } from 'openai/streaming';

import type { PangeaOpenAI } from '../../client.js';
import { PangeaAIGuardBlockedError } from '../../core/error.js';

function isResponseInputText(
  x: OpenAI.Responses.ResponseContent
): x is OpenAI.Responses.ResponseInputText {
  return x.type === 'input_text';
}

function isResponseOutputMessage(
  x: OpenAI.Responses.ResponseOutputItem
): x is OpenAI.Responses.ResponseOutputMessage {
  return x.type === 'message';
}

function toPangeaMessages(
  message: OpenAI.Responses.ResponseInputItem
): { role: 'system' | 'user' | 'assistant' | 'developer'; content: string }[] {
  switch (message.type) {
    case 'message': {
      if (typeof message.content === 'string') {
        return [{ role: message.role, content: message.content }];
      }
      if (message.content) {
        return message.content.filter(isResponseInputText).map(({ text }) => ({
          role: message.role,
          content: text,
        }));
      }
      return [];
    }
    default:
      return [];
  }
}

export class PangeaResponses extends Responses {
  protected _client: PangeaOpenAI;

  constructor(client: PangeaOpenAI) {
    super(client);
    this._client = client;
  }

  /**
   * Creates a model response. Provide
   * [text](https://platform.openai.com/docs/guides/text) or
   * [image](https://platform.openai.com/docs/guides/images) inputs to generate
   * [text](https://platform.openai.com/docs/guides/text) or
   * [JSON](https://platform.openai.com/docs/guides/structured-outputs) outputs. Have
   * the model call your own
   * [custom code](https://platform.openai.com/docs/guides/function-calling) or use
   * built-in [tools](https://platform.openai.com/docs/guides/tools) like
   * [web search](https://platform.openai.com/docs/guides/tools-web-search) or
   * [file search](https://platform.openai.com/docs/guides/tools-file-search) to use
   * your own data as input for the model's response.
   *
   * @example
   * ```ts
   * const response = await client.responses.create();
   * ```
   */
  override create(
    body: ResponseCreateParamsNonStreaming,
    options?: OpenAI.RequestOptions
  ): APIPromise<Response>;
  override create(
    body: ResponseCreateParamsStreaming,
    options?: OpenAI.RequestOptions
  ): APIPromise<Stream<ResponseStreamEvent>>;
  override create(
    body: ResponseCreateParamsBase,
    options?: OpenAI.RequestOptions
  ): APIPromise<Stream<ResponseStreamEvent> | Response>;
  override create(
    body: ResponseCreateParams,
    options?: OpenAI.RequestOptions
  ): APIPromise<Response> | APIPromise<Stream<ResponseStreamEvent>> {
    if (body.stream) {
      return super.create(body, options);
    }

    let messages: {
      role: 'system' | 'user' | 'assistant' | 'developer';
      content: string;
    }[] = [];

    if (body.instructions) {
      messages.push({
        role: 'system',
        content: body.instructions,
      });
    }

    if (typeof body.input === 'string') {
      messages.push({
        role: 'user',
        content: body.input,
      });
    } else if (body.input) {
      messages = messages.concat(...body.input.map(toPangeaMessages));
    }

    return this._client.aiGuardClient
      .guardText({ messages, recipe: this._client.pangeaInputRecipe })
      .then((inputGuardResponse) => {
        if (inputGuardResponse.result.blocked) {
          throw new PangeaAIGuardBlockedError();
        }

        if (
          inputGuardResponse.result.transformed &&
          inputGuardResponse.result.prompt_messages
        ) {
          body.input = inputGuardResponse.result.prompt_messages as {
            role: 'system' | 'user' | 'assistant' | 'developer';
            content: string;
          }[];
        }

        return super.create(body, options);
      })
      .then((response) => {
        return Promise.all([
          response,
          this._client.aiGuardClient.guardText({
            messages: messages.concat([
              { role: 'assistant', content: response.output_text },
            ]),
            recipe: this._client.pangeaOutputRecipe,
          }),
        ]);
      })
      .then(([response, outputGuardResponse]) => {
        if (outputGuardResponse.result.blocked) {
          throw new PangeaAIGuardBlockedError();
        }

        if (
          outputGuardResponse.result.transformed &&
          outputGuardResponse.result.prompt_messages
        ) {
          response.output_text =
            outputGuardResponse.result.prompt_messages.at(-1)?.content ?? '';

          if (response.output.length === 1) {
            const item = response.output[0];
            if (isResponseOutputMessage(item)) {
              item.content = [
                {
                  annotations: [],
                  logprobs: [],
                  type: 'output_text',
                  text: response.output_text,
                },
              ];
            }
          }
        }

        return response;
      }) as APIPromise<Response>;
  }
}
