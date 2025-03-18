const Parse = require("./dist/parse").default;
const { ensureConfigJson } = require("./dist/utils");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
ensureConfigJson();
const data = fs.readFileSync(path.join(process.cwd(), "./origin.yaml"), "utf-8");
const yamlData = yaml.load(data);

const { paths, tags } = yamlData;
const tagMap = new Map();
const pathKeys = Object.keys(paths);

pathKeys.forEach((url) => {
  Object.keys(paths[url]).forEach((method) => {
    const pathObjValue = paths[url][method];
    const tag = pathObjValue.tags[0];
    tagMap.set(tag, { ...tagMap.get(tag), [url]: paths[url] });
  });
});

tagMap.forEach((value, tag) => {
  const parse = new Parse(value, tag, yamlData);
  const sourceCode = parse.parse();
  parse.write(sourceCode);
});
