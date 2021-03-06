import { Schema, SwaggerSchema } from '../types';
import { getErrorType, PropertyProcessorContext, SchemaPropertyFactory } from './schemaProperty';

export interface SchemaFactoryContext {
  hasErrors: boolean;
}

export class SchemaFactory {

  constructor(protected schemaPropertyFactory: SchemaPropertyFactory) {
  }

  translateSchema(name: string, schema: SwaggerSchema, schemaFactoryContext: SchemaFactoryContext):
    Schema | Schema[] | null {

    if (schema.properties) {
      return this.translateOneSchema(name, schema, schemaFactoryContext);
    }

    if (Array.isArray(schema.oneOf)) {
      return schema.oneOf
        .map((subschema, index) => this.translateSchema(`${name}${index}`, subschema, schemaFactoryContext))
        .filter(item => !!item) as Schema[];
    }

    return null;

  }

  translateOneSchema(name: string, schema: SwaggerSchema, schemaFactoryContext: SchemaFactoryContext): Schema | null {

    if (!schema.properties) {
      return null;
    }

    const resultSchema: Schema = {
      name,
      properties: {},
    };

    const ctx: PropertyProcessorContext = Object.assign(
      {
        schemaName: name,
        swaggerSchema: schema,
        schemaPropertyFactory: this.schemaPropertyFactory,
      },
      schemaFactoryContext);

    for (const propertyName in schema.properties) {
      const property = this.schemaPropertyFactory.translateProperty(
        propertyName,
        schema.properties[propertyName],
        (!!schema.required) && schema.required.indexOf(propertyName) >= 0,
        ctx,
      );

      if (property) {
        resultSchema.properties[propertyName] = property;
      } else {
        resultSchema.properties[propertyName] = getErorrProperty(`Unable to translate Property ${propertyName}`);
        ctx.hasErrors = true;
      }
    }

    schemaFactoryContext.hasErrors = schemaFactoryContext.hasErrors || ctx.hasErrors;

    return resultSchema;
  }
}

export function getErorrProperty(description: string) {
  return {
    name: description,
    isRequired: false,
    types: [getErrorType(`No appropriate type found`)],
  };
}
