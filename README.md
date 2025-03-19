# swagger 自动生成ts类型工具

## 最小案例复现

安装依赖

```bash
npm install
```

基于`origin.yaml`生产 `ts` 类型文件，默认在`src/@types`目录下生成类型文件，配合 cli 一起使用，功能更丰富

```bash
npm start
```

## cli 使用

### 参数介绍

```bash
  ls                       List all the config
  use [name]               Use config name
  add [name] [value]       Add config
  rename <name> <newName>  Rename config name
  del [name]               Delete config name
  set-dir [name]           Set output dir value
  get [name]               Get config info
  update [name]            Generate .d.ts file
  help [command]           display help for command
```

#### stt add 添加配置

```bash
$ stt add bb-admin http://example.com:8002
```

#### stt ls 查看配置

```bash
$ stt ls

  bb-admin ----------- http://example.com:8002
```

#### stt use 使用配置

```bash
$ stt use bb-admin

```

再用`ls`命令查看一下

```bash
$ stt ls

* bb-admin --------- http://example.com:8002
```

#### stt rename 修改配置名称

```bash
$ stt rename bb-admin bb-admin-new
```

`ls` 查看一下

```bash
* bb-admin-new ----- http://example.com:8002
```

#### stt del 删除配置

```bash
$ stt add test http://test.com

$ stt ls

* bb-admin-new ----- http://example.com:8002
  test ------------- http://test.com

$ stt del test
$ stt ls

* bb-admin-new ----- http://example.com:8002
```

#### stt set-dir 设置 ts 类型文件输出目录

默认目录为`src/@types`，也支持自定义目录。

```bash
// 查看一下输出文件目录
$ stt get dir

src/@types

$ stt set-dir src/demo

```

设置之后，ts 类型文件会默认输出到当前路径的`src/demo`目录下。

#### （主要功能）stt update

根据配置的 `dir` 文件目录，和当前使用的配置，生成对应的`.d.ts` 文件。

#### stt get 获取配置信息

```bash
$ stt get dir
src/@types
```
