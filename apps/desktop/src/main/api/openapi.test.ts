// The OpenAPI document is the API's public contract (ADR-0011): this test
// keeps it valid and in step with the code, so it cannot drift.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BROWSER_CAPABILITIES,
  browsingContextSchema,
  EXTENSION_ORIGIN,
  NO_BROWSER_CAPABILITIES,
} from '@mocha/core';
import { Validator } from '@seriousme/openapi-schema-validator';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { z } from 'zod';
import { handleApiRequest, ROUTES } from './api-handler.ts';

const spec = parse(
  readFileSync(join(import.meta.dirname, '../../../../../docs/openapi.yaml'), 'utf8'),
);

/** A schema without what only explains it: what is left must match the code. */
function shape(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(shape);
  if (schema === null || typeof schema !== 'object') return schema;
  return Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => key !== 'description' && key !== 'examples')
      .map(([key, value]) => [key, shape(value)]),
  );
}

describe('docs/openapi.yaml', () => {
  it('is a valid OpenAPI 3.1 document', async () => {
    const result = await new Validator().validate(spec);

    expect(result.errors ?? []).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('would catch a broken document', async () => {
    const { info: _, ...withoutInfo } = spec;
    const badPath = { ...spec, paths: { 'v1/health': spec.paths['/v1/health'] } };

    expect((await new Validator().validate(withoutInfo)).valid).toBe(false);
    expect((await new Validator().validate(badPath)).valid).toBe(false);
  });

  it('lists exactly the routes and methods the API serves', () => {
    const documented = Object.fromEntries(
      Object.entries(spec.paths as Record<string, object>).map(([path, item]) => [
        path,
        Object.keys(item).map((method) => method.toUpperCase()),
      ]),
    );

    expect(documented).toEqual(ROUTES);
  });

  it('describes the browsing context exactly as the API checks it', () => {
    const { $schema: _, ...fromCode } = z.toJSONSchema(browsingContextSchema);

    expect(shape(spec.components.schemas.BrowsingContext)).toEqual(fromCode);
  });

  it('lists every capability, each a required boolean', () => {
    const capabilities = spec.components.schemas.BrowserCapabilities;

    expect(Object.keys(capabilities.properties)).toEqual([...BROWSER_CAPABILITIES]);
    expect(capabilities.required).toEqual([...BROWSER_CAPABILITIES]);
    for (const property of Object.values(capabilities.properties)) {
      expect(property).toMatchObject({ type: 'boolean' });
    }
  });

  it('asks every operation for the origin the API accepts', () => {
    const origin = spec.components.parameters.ExtensionOrigin;

    expect(origin.schema.const).toBe(EXTENSION_ORIGIN);
    for (const item of Object.values(
      spec.paths as Record<string, Record<string, { parameters: unknown[] }>>,
    )) {
      for (const operation of Object.values(item)) {
        expect(operation.parameters).toContainEqual({
          $ref: '#/components/parameters/ExtensionOrigin',
        });
      }
    }
  });

  it('shows the health answer the API gives', () => {
    const response = handleApiRequest(
      {
        method: 'GET',
        path: '/v1/health',
        headers: {
          host: '127.0.0.1:47213',
          origin: 'chrome-extension://test',
          authorization: 'Bearer token',
        },
        body: '',
        port: 47213,
      },
      {
        token: 'token',
        origin: 'chrome-extension://test',
        allowRequest: () => true,
        capabilities: () => NO_BROWSER_CAPABILITIES,
        report: () => {},
      },
    );
    const example =
      spec.paths['/v1/health'].get.responses['200'].content['application/json'].example;

    expect(JSON.parse(response.body)).toEqual(example);
  });

  it('gives examples the API accepts', () => {
    const examples =
      spec.paths['/v1/context'].post.requestBody.content['application/json'].examples;

    for (const { value } of Object.values(examples as Record<string, { value: unknown }>)) {
      expect(browsingContextSchema.safeParse(value).success).toBe(true);
    }
  });
});
