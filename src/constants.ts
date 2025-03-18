import os from "os";
import path from "path";

export const homeDir = path.join(os.homedir(), ".qjxt-stt.json");
export const MIN_LINE = 3;
export const PREFIX_SPACE = 2;
export const MAXLENGTH = 22;
export const REQUEST_SUFFIX = "/swagger/openapi.yaml";

export type Method = "get" | "post" | "put" | "delete";
export type Status = "200" | "400" | "500" | "404" | "401";
export interface SwaggerDataProps {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  tags: { name: string }[];
  paths: {
    [url: string]: {
      [key in Method]: {
        tags: string[];
        summary: string;
        description: string;
        operationId: string;
        parameters: {
          name: string;
          in: "query" | "path";
          description: string;
          required?: boolean;
          schema: {
            type: string;
            format: string;
            enum: string[];
            description?: string;
          };
        }[];
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: string;
              };
            };
          };
          required: boolean;
        };
        responses: {
          [key in Status]: {
            description: "OK";
            content: {
              "application/json": {
                schema: {
                  $ref: string;
                };
              };
            };
          };
        };
      };
    };
  };
  components: {
    schema: {
      [key: string]: {
        type: string;
        required?: string[];
        properties: {
          [key: string]: {
            type: string;
            description?: string;
            format?: string;
            enum?: string[];
            items?: {
              $ref?: string;
            };
          };
        };
      };
    };
  };
}

type MethodType<Method extends keyof SwaggerDataProps["paths"][string]> = SwaggerDataProps["paths"][string][Method];
export type OperationObject = {
  _url: string;
  _method: string;
} & MethodType<"get">;

export type InterfaceSuffix = "Query" | "Response" | "Body";

export type Property = {
  key: string;
  description?: string;
  required?: boolean;
  type:
    | string
    | {
        $ref?: string;
        type?: string;
        props?: string;
      }
    | undefined;
};

export interface Menus {
  id: number;
  name: string;
  children?: Menus[];
}

type EnumType = "string" | "number" | "boolean";
type ListType = string[];

const list: ListType = [];
