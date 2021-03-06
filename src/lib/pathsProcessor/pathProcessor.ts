import { HttpMethods, Method, Schema, SwaggerMethod } from "../types";
import { SchemaFactory } from '../schemaProcessor/schema';


export interface MethodProcessorContext {
  hasErrors: boolean;
}

export class PathProcessor {

  constructor(protected schemaFactory: SchemaFactory) {}

  public translatePath(methodUrl: string,
                       method: HttpMethods,
                       swaggerMethod: SwaggerMethod,
                       ctx: MethodProcessorContext,
    ): Method {
    let tag = swaggerMethod.tags && swaggerMethod.tags[0];
    let name = swaggerMethod['x-metadata'] && swaggerMethod['x-metadata'].method;

    if (!tag) {
      console.error(`Method ${method} ${methodUrl} has to tags`);
      tag = 'NoTags';
      ctx.hasErrors = true;
    }

    if (!name) {
      console.error(`Method ${method} ${methodUrl} has to x-metadata.method`);
      name = 'NoMethod';
      ctx.hasErrors = true;
    }

    const capitalizedName = name.charAt(0).toLocaleUpperCase() + name.slice(1);

    let requestSchema: Schema | Schema[] | 'link' | null = null;
    let requestForm = null;

    if (!swaggerMethod.requestBody ||
            !swaggerMethod.requestBody.content) {
      console.warn(`Method ${method} ${methodUrl} has no request body schema`);
    } else {

      // Because of BUG in TypeScript
      const appjson = swaggerMethod.requestBody.content['application/json'];
      const form = swaggerMethod.requestBody.content['multipart/mixed'];

      if ((!appjson || !appjson.schema) && (!form || !form.schema))  {
        console.warn(`Method ${method} ${methodUrl} has no request body schema`);
      } else {
        if (appjson && appjson.schema) {
          requestSchema = this.schemaFactory.translateSchema(
            `${tag}${capitalizedName}Request`,
            appjson.schema,
            ctx,
          );
        }
        if (form && form.schema) {
          requestForm = this.schemaFactory.translateSchema(
            `${tag}${capitalizedName}Form`,
            form.schema,
            ctx,
          );

          if (Array.isArray(requestForm)) {
            ctx.hasErrors = true;
            console.error(`${name} Only simple schema for Form is supported.`);
            requestForm = requestForm[0];
          }
        }
      }
    }

    let responseSchema: Schema | Schema[] | 'link' | null = null;

    if (!swaggerMethod.responses) {
      console.warn(`Method ${method} ${methodUrl} has no response`);
    } else {
      // Because of bug in TypeScript
      const r200 = swaggerMethod.responses['200'];
      if (!r200 || !r200.content) {
        console.warn(`Method ${method} ${methodUrl} has no 200 response`);
      } else {
        // Because of bug in TypeScript
        const appjson = r200.content['application/json'];
        if (!appjson || !appjson.schema) {
          if (r200.content['image/jpeg'] || r200.content['image/png'] || r200.content['*/*']) {
            responseSchema = 'link';
          } else {
            console.warn(`Method ${method} ${methodUrl} has no 200 response schema`);
          }
        } else {
          responseSchema = this.schemaFactory.translateSchema(
                        `${tag}${capitalizedName}Response`,
                        appjson.schema,
                        ctx);
        }
      }
    }

    return {
      name,
      tag,
      method,
      url: methodUrl,
      description: swaggerMethod.description || '',
      summary: swaggerMethod.summary || '',
      request: requestSchema,
      form: requestForm,
      response: responseSchema,
    };
  }
}
