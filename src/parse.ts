import { SwaggerDataProps, Method, OperationObject, InterfaceSuffix, Property } from "./constants";
import { firstLetterCap, getFilePath, getFunctionName, getUrlPathField, toCamelCase } from "./utils";
import _, { isEmpty } from "lodash";
import fs from "fs";
import path from "path";

class Parse {
  paths: SwaggerDataProps["paths"];
  codeMap: Map<string | symbol, string>;
  dirname: string;
  apiDocs: SwaggerDataProps;
  constructor(paths: SwaggerDataProps["paths"], tag: string, apiDocs: SwaggerDataProps) {
    this.paths = paths;
    this.apiDocs = apiDocs;
    this.dirname = tag;
    this.codeMap = new Map();
    this.init();
  }
  init() {
    const initName = Symbol("init");
    const code = `
import { request } from '@request';
/**
 * @title ${_.get(this.apiDocs, ["info", "title"], "")}
 * @description ${_.get(this.apiDocs, ["info", "description"], "")}
 * @version ${_.get(this.apiDocs, ["info", "version"], "")}
 * @date ${new Date().toLocaleString()}
 **/`;
    this.codeMap.set(initName, code);
  }
  getSourceCode() {
    let codes = "";
    this.codeMap.forEach((code) => {
      codes += code;
    });
    return codes;
  }
  parse() {
    Object.keys(this.paths).forEach((url) => {
      const methodDetails = this.paths[url];
      (Object.keys(this.paths[url]) as Method[]).forEach((method: Method) => {
        let str = "";
        const { parameters, requestBody, responses } = methodDetails[method];
        const operationObject: OperationObject = {
          ...methodDetails[method],
          _url: url,
          _method: method,
        };
        // path query body response request 暂时不生成path参数
        if (parameters) {
          str += this.genQueryInterface(operationObject);
        }
        if (requestBody) {
          str += this.genBodyInterface(operationObject);
        }
        if (responses) {
          str += this.genRequestInterface(operationObject); // 生成请求函数
          str += this.genResponseInterface(operationObject);
        }
        this.codeMap.set(`${url}+${method}`, str);
      });
    });
    return this.getSourceCode();
  }
  async write(sourceCode: string) {
    const filePath = await getFilePath(this.dirname);
    fs.writeFileSync(filePath, sourceCode);
  }

  getJsType(info: any) {
    // 解析body里面的type类型 info.$ref
    // response => info.allOf[0].$ref
    // response => info.items.$ref && info.type === array
    function getEnumType(enums: string[]) {
      let props = enums.reduce((acc, cur, index) => {
        if (index === 0) return acc;
        return acc + (index !== 1 ? " | " : "") + `'${cur}'`;
      }, "");
      return {
        type: "enum",
        props,
      };
    }
    if (info["$ref"]) {
      return {
        $ref: info["$ref"],
      };
    } else if (_.get(info, ["allOf", "0", "$ref"])) {
      return {
        $ref: _.get(info, ["allOf", "0", "$ref"]),
      };
    } else if (info?.["items"]?.["$ref"]) {
      return {
        type: "array",
        $ref: info["items"]["$ref"],
      };
    } else if (info?.type === "array" && ["string", "number"].includes(info?.items?.type)) {
      return {
        type: "array",
        props: info?.items?.type,
      };
    } else if (["integer", "number"].includes(info.type)) {
      return "number";
    } else if (info.type === "boolean") {
      return "boolean";
    } else if (info.type === "string") {
      if (info.format === "enum") {
        return getEnumType(info.enum);
      }
      return "string";
    }
  }

  genQueryInterface(operationObject: OperationObject) {
    const { parameters } = operationObject;
    // path参数参数不考虑，只生成query ===> xxx?id=1&name=1
    const params = parameters.filter((item) => item.in === "query");
    if (params.length === 0) return "";
    const interfaceName = this.getInterfaceName(operationObject.operationId, "Query");
    const properties = params.map((param) => {
      return {
        key: param.name,
        description: param.description,
        required: param.required || false,
        type: this.getJsType(param.schema),
      };
    });
    const comments = this.getComments({
      type: "Query",
      _url: operationObject._url,
      _method: operationObject._method,
    });
    return this.interfaceTemplate(interfaceName, properties, comments);
  }

  genBodyInterface(operationObject: OperationObject) {
    const { requestBody } = operationObject;
    const uriValue = _.get(requestBody, ["content", "application/json", "schema", "$ref"], "");
    const interfaceName = this.getInterfaceName(operationObject.operationId, "Body");
    const schema: SwaggerDataProps["components"]["schema"]["string"] = this.getSchemaByRef(uriValue);
    const { required = [], type, properties } = schema;
    // body里面可能为空，为空，直接返回空字符串
    if (isEmpty(schema)) return "";

    const _properties = Object.keys(schema.properties).map((key) => {
      const info = schema.properties[key];
      return {
        key,
        type: this.getJsType(info),
        description: info.description,
        required: required.includes(key),
      };
    });

    const comments = this.getComments({
      type: "Body",
      _url: operationObject._url,
      _method: operationObject._method,
    });
    return this.interfaceTemplate(interfaceName, _properties, comments);
  }

  genRequestInterface(operationObject: OperationObject) {
    const methodMap = {
      put: "update",
      delete: "delete",
      get: "get",
      post: "create",
    };
    const prefix = methodMap[operationObject._method as "put" | "delete" | "get" | "post"];
    const pathField = getUrlPathField(operationObject._url);
    const suffix = pathField ? `By${firstLetterCap(pathField)}` : "";
    const functionName = getFunctionName(operationObject._url);
    // ${prefix}${functionName}${suffix}
    return `

export const ${prefix}${functionName}${suffix} = async <T>(options) => {
  return (await request<T>({
    method: "${operationObject._method}",
    options,
    url: "${operationObject._url}",
  })) as T;
};`;
  }

  genResponseInterface(operationObject: OperationObject) {
    const ref = _.get(operationObject.responses, ["200", "content", "application/json", "schema", "$ref"], "");
    if (_.isEmpty(ref)) return "";
    const schema = this.getSchemaByRef(ref);
    const interfaceName = this.getInterfaceName(operationObject.operationId, "Response");
    const { required = [], type, properties } = schema;
    const _properties = Object.keys(schema.properties).map((key) => {
      const info = schema.properties[key];
      return {
        key,
        type: this.getJsType(info),
        description: info.description,
        required: required.includes(key),
      };
    });
    const comments = this.getComments({
      type: "Response",
      _url: operationObject._url,
      _method: operationObject._method,
    });
    return this.interfaceTemplate(interfaceName, _properties, comments);
  }

  getInterfaceName(operationId: string, suffix: InterfaceSuffix) {
    const names = operationId?.split("_") || "";
    const name = names[names.length - 1];
    return firstLetterCap(name) + suffix;
  }

  getComments(options: { _url?: string; _method?: string; type: InterfaceSuffix }) {
    return `
/**
 * ${options.type}
 * url ${options._url}
 * method ${options._method}
 */`;
  }

  interfaceTemplate(interfaceName: string, properties: Property[], comments: string = "", isExport = true) {
    let code = `
${comments}
${isExport ? "export" : ""} interface ${interfaceName} {${this.generatorInterfaceContent(properties, interfaceName)}
}`;
    return code;
  }

  generatorInterfaceContent(properties: Property[], interfaceName: string) {
    return properties.reduce((acc, cur) => {
      return acc + this.genLineContent(cur, interfaceName);
    }, "");
  }

  genLineContent(lineInfo: Property, interfaceName: string) {
    let line = `
  /** ${lineInfo.description || ""} */
  ${lineInfo.key}${lineInfo.required ? "" : "?"}: ${this.genType(lineInfo.type, interfaceName, lineInfo.key)};`;
    return line;
  }

  genType(type: Property["type"], interfaceName?: string, key?: string) {
    if (typeof type === "string") return type;
    // 有$ref属性的可能是数组/对象
    if (type && typeof type["$ref"] === "string") {
      // #/components/schemas/web.interface.v1.PhoneInfo
      const schemaPaths = type["$ref"].split("/");
      // web.interface.v1.PhoneInfo
      const schemaLastPath = schemaPaths[schemaPaths.length - 1];
      const tempInterfaceName = schemaLastPath.split(".");
      // PhoneInfo
      const subInterfaceName = tempInterfaceName[tempInterfaceName.length - 1];
      // 避免循环引用
      if (subInterfaceName === interfaceName) {
        return type?.type === "array" ? `${subInterfaceName}[]` : subInterfaceName;
      }
      const schema = this.getSchemaByRef(type["$ref"]);
      const { required = [] } = schema;
      const _properties = Object.keys(schema.properties).map((key) => {
        const info = schema.properties[key];
        return {
          key,
          type: this.getJsType(info),
          description: info.description,
          required: required.includes(key),
        };
      });
      this.codeMap.set(schemaLastPath, this.interfaceTemplate(subInterfaceName, _properties));
      return type?.type === "array" ? `${subInterfaceName}[]` : subInterfaceName;
    }
    // 枚举类型
    if (type && type?.type === "enum") {
      let typeName = `${toCamelCase(firstLetterCap(key!))}Type`;

      if (this.codeMap.has(typeName)) {
        typeName = `${interfaceName}${typeName}`;
      }

      const typeCodeStr = `
export type ${typeName} = ${type.props}`;

      this.codeMap.set(typeName!, typeCodeStr);

      return typeName;
    }
    // string[]  number[]
    if (type && type?.type === "array" && type?.props) {
      return `${type.props}[]`;
    }
  }

  getSchemaByRef(path = "", defaultValue = {}) {
    if (_.isEmpty(path)) return {};
    const paths = path.split("/");
    let schema: any = this.apiDocs;
    let pos = 1;
    while (pos < paths.length) {
      const current = schema[paths[pos++]];
      schema = current;
      if (!current) break;
    }
    return schema || defaultValue;
  }
}

export default Parse;
