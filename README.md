# Maxbuy Shopify 主题

本仓库是 Shopify Online Store 2.0 主题。`assets`、`blocks`、`config`、`layout`、`locales`、`sections`、`snippets`、`templates` 是 Shopify 约定的顶层目录，不应为了分组而改名或移动。

## 文件职责

| 目录 | 用途 |
| --- | --- |
| `sections/` | 页面组件的 Liquid 结构、Schema、按实例变化的配置值。 |
| `blocks/` | 可复用的 Theme Block 及 Schema。 |
| `snippets/` | 被 Section 或 Layout 调用的 Liquid 片段。 |
| `assets/` | 组件专属或全局共用的 CSS、JS、字体和图片。 |
| `templates/` | 页面组件组合及后台编辑器设置。JSON 模板可能被编辑器更新。 |
| `config/` | 主题配置；`settings_data.json` 含商家配置数据。 |
| `locales/` | 翻译文本。 |
| `docs/` | 实现说明，不是前台资源。 |

## Section 约定

1. 组件专属资源与 Section 同名，例如 `sections/main-collection-banner.liquid` 和 `assets/main-collection-banner.css`；由 Section 引入，避免其他页面加载不需要的资源。
2. Liquid 保留 HTML、Schema 和后台配置；静态样式与交互脚本放在独立文件。没有交互时无需创建 JS 文件。
3. 依赖 `section.id`、`block.id` 或后台设置的少量动态样式可以留在 Liquid 中，并限定到当前实例；优先通过 CSS 变量传值。集合页 Banner 影响共享 Header 的透明状态，其相关动态样式目前保留在 Liquid 中。
4. 自定义 CSS 使用 Section 类名或组件前缀限定范围。多个无关 Section 共用的规则放在共享资源文件中。
5. 非首屏关键交互使用 `defer` 加载 JS。初始化应按 Section 实例处理；后台编辑器重新渲染时，按需处理 `shopify:section:load` 与 `shopify:section:unload`。
6. 源码保持可读；发布前检查资源压缩和性能。不要仅为统一形式而批量改写旧组件。

## 本地与正式主题同步

正式主题的后台编辑器会修改 JSON 模板或 `config/settings_data.json`。拉取或推送前先检查 `git status`。将正式主题拉到独立临时目录，对比后合并需要保留的后台修改；不要在有本地改动的工作目录直接全量拉取。推送正式主题前，预览受影响页面，并再次核对线上配置。

相关检查命令：`shopify theme check`、`git diff --check`。Theme Check 目前有历史告警及错误；整理文件时应确认没有引入新的问题，不能把全量检查视为已通过。

## 产品详情页 CSS

只编辑 `assets/main-product.css` 和 `assets/maxbuy-product-mobile.css`。主文件维护通用与桌面样式，移动文件集中维护小于 768px 的尺寸差异；`.min.css` 是页面加载的生成文件，不手动修改。

一次生成两份压缩文件：

```sh
sh scripts/build-product-css.sh
```

开发时持续监听并自动更新：

```sh
sh scripts/build-product-css.sh --watch=forever
```

脚本使用固定版本 esbuild 0.28.1；首次通过 npx 使用时需要网络下载工具。已有 esbuild 可通过 `ESBUILD_BIN` 指定可执行文件。

## 公共面包屑

各页面共用 `snippets/breadcrumbs.liquid` 和 `assets/maxbuy-breadcrumbs.css`。面包屑代表当前页面层级；模板只启用一个主要 Section 的面包屑，作为附加内容使用的集合等 Section 应关闭面包屑。保留原有 Section 外层容器、后台开关和 Banner Block 顺序，避免移动导航时改变现有布局。

公共间距由 `.maxbuy-breadcrumb__inner` 管理。集合页和商品页的现有间距在各自 CSS 中通过该类覆盖，不依赖多层 `div` 或工具类。修改公共样式或集合页覆盖后，重新生成加载文件：

```sh
npx --yes esbuild@0.28.1 assets/maxbuy-breadcrumbs.css assets/main-maxbuy-collection.css --minify --outdir=assets --out-extension:.css=.min.css
```

商品移动端覆盖仍通过上面的 `scripts/build-product-css.sh` 构建。
