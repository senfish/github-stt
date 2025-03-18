import { Method, REQUEST_SUFFIX, SwaggerDataProps } from "./constants";
import fs from "fs";
import {
  genLineAndName,
  readConfigFile,
  request,
  writeConfigFile,
} from "./utils";
import path from "path";
import yaml from "js-yaml";
import Parse from "./parse";
import { isNumber } from "lodash";

export const getList = () => {
  const sttJsonObj = readConfigFile();
  const { current, config } = sttJsonObj;
  let messages: string[] = [];

  config.forEach((item: string[], index: number) => {
    const [name, value] = item;
    let str = "";
    if (current === index) {
      str = `* ${genLineAndName(name)} ${value}`;
    } else {
      str = `  ${genLineAndName(name)} ${value}`;
    }
    messages.push(str);
  });

  console.log(messages.join("\n"));
};

export const onUse = (name: string) => {
  if (!name) return console.log("请输入配置名称");

  const sttJsonObj = readConfigFile();
  const { config } = sttJsonObj;

  const index = config.findIndex((item: string[]) => item[0] === name);
  if (index === -1) return console.log("配置名不存在");

  sttJsonObj.current = index;
  writeConfigFile(sttJsonObj);
};

export const onAdd = (name: string, value: string) => {
  if (!name || !value) return console.log("请输入配置名称和配置值");

  const sttJsonObj = readConfigFile();
  const { config } = sttJsonObj;
  const index = config.findIndex((item: string[]) => item[0] === name);
  if (index !== -1) {
    sttJsonObj.config[index] = [name, value];
  } else {
    sttJsonObj.config.push([name, value]);
  }
  writeConfigFile(sttJsonObj);
};

export const onRename = (oldName: string, newName: string) => {
  const sttJsonObj = readConfigFile();
  const { config } = sttJsonObj;
  const index = config.findIndex((item: string[]) => item[0] === oldName);
  if (index === -1) return console.log("配置名不存在");
  config[index][0] = newName;
  writeConfigFile(sttJsonObj);
};

export const onDelete = (name: string) => {
  const sttJsonObj = readConfigFile();
  let { config } = sttJsonObj;
  sttJsonObj.config = config.filter((item: string[]) => item[0] !== name);
  writeConfigFile(sttJsonObj);
};

export const onGet = (name: string) => {
  if (!name) return console.log("请输入配置名称");
  const sttJsonObj = readConfigFile();
  console.log(sttJsonObj[name]);
};

export const onSetDir = (name: string) => {
  if (!name) return console.log("请输入文件目录");
  const sttJsonObj = readConfigFile();
  sttJsonObj["dir"] = name;
  writeConfigFile(sttJsonObj);
};
export const onUpdate = async () => {
  const sttJsonObj = readConfigFile();
  const { config, current } = sttJsonObj;
  if (!isNumber(current) || !config[current])
    return console.log("请先使用配置");
  const [, value] = config[current];
  const url = path.join(value, REQUEST_SUFFIX);
  const data = await request(url);
  // const data = fs.readFileSync(
  //   path.join(process.cwd(), "./test.yaml"),
  //   "utf-8"
  // );

  const yamlData = yaml.load(data as string) as SwaggerDataProps;
  // 考虑后续上了微服务，建议区分tag模式跟微服务模式
  // 目前只适配tag模式

  const { paths, tags } = yamlData;
  const tagMap = new Map();
  const pathKeys = Object.keys(paths);

  pathKeys.forEach((url) => {
    (Object.keys(paths[url]) as Method[]).forEach((method) => {
      const pathObjValue = paths[url][method];
      const tag = pathObjValue.tags[0];
      tagMap.set(tag, { ...tagMap.get(tag), [url]: paths[url] });
    });
  });

  tagMap.forEach((value, tag) => {
    // if (tag === "MsgCenter") {
    const parse = new Parse(value, tag, yamlData);
    const sourceCode = parse.parse();
    parse.write(sourceCode);
    // }
  });
};
