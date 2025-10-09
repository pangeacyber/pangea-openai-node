import type { OpenAI } from 'openai';

import type { HTTPMethod } from './types';

export type FinalRequestOptions = OpenAI.RequestOptions & {
  method: HTTPMethod;
  path: string;
};
