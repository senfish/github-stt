import fs from "fs";
import path from "path";
import { homeDir, MAXLENGTH, MIN_LINE, PREFIX_SPACE } from "./constants";
import axios from "axios";

const defaultConfig = `
{
  "config": [],
  "dir": "src/@types"
}
`;
export const ensureConfigJson = () => {
  if (!fs.existsSync(homeDir)) {
    fs.writeFileSync(homeDir, defaultConfig);
  }
};

// `${prefix} ${name} --- ${value}`
export const genLineAndName = (name: string) => {
  const lens = name.length;
  const times = MAXLENGTH - PREFIX_SPACE - MIN_LINE - lens;
  if (times < 0) {
    console.log("不能超过15个字符");
    return;
  }
  return name + " " + "-".repeat(times);
};

export const readConfigFile = () => {
  const sttJson = fs.readFileSync(homeDir, "utf-8");
  try {
    const sttJsonObj = JSON.parse(sttJson);
    return sttJsonObj || {};
  } catch (e) {
    console.log("解析文件失败", e);
    return {};
  }
};

export const writeConfigFile = (sttJsonObj: string) => {
  fs.writeFileSync(homeDir, JSON.stringify(sttJsonObj, null, 2));
};

export const request = (url: string) => {
  return new Promise((resolve, reject) => {
    axios
      .get(url)
      .then((res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/** 首字大写 */
export const firstLetterCap = (str: string) => {
  if (typeof str !== "string") return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const ensureDirSync = (dirPath: string) => {
  const abs = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(abs)) {
    fs.mkdirSync(abs, {
      recursive: true,
    });
  }
};
export const getFilePath = async (dirname: string) => {
  const { dir } = readConfigFile();
  const abs = path.resolve(process.cwd(), dir, dirname);
  await ensureDirSync(abs);
  return path.join(abs, "index.ts");
};

// 得到url里面的path
export const getUrlPathField = (str: string) => {
  var regex = /\{([^\/\}]+)\}/;
  const match = str.match(regex);
  return match ? match[1] : "";
};
// 去掉path之后的url
export const filterUrlPath = (str: string) => {
  const regex = /\/\{[^\/\}]+\}/g;
  return str.replace(regex, "");
};
export const getFunctionName = (url: string) => {
  // /admin/api/v1/announcement/type/{id}/name ===> announcement/type/name
  url = filterUrlPath(url);
  const [, str] = url.split("/v1/");
  let originName = str ?? url;
  originName = firstLetterCap(originName);
  let res = "";
  for (let i = 0; i < originName.length; i++) {
    const char = originName[i];
    if (["_", "/", "-"].includes(char)) {
      res += originName[i + 1].toUpperCase();
      i++;
    } else {
      res += char;
    }
  }
  return res;
};

export const toCamelCase = (str: string) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};
