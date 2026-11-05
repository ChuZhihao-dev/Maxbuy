# Collection 统一商品池改造与验收记录

依据：仓库根目录 `shopify-collection-development-plan.md` 与 `shopify-collection-development-prompt.md`。日期：2026-11-04。此记录取代 `collection-page.md` 中旧版分类单选导航、全店 Vendor 目录和缺失项补零的方案。

## 当前分类筛选来源：仅原生 Search & Discovery

按用户最新要求，`/collections/all` 的 Product Categories 仅展示配置的原生分类来源（当前 Product type）的真实值，不再混入 Series 菜单中的灰色产品系列占位项，也不追加其他 Category Entry blocks。品牌完整菜单逻辑保留。旧集合页的入口映射和全站系列链接继续使用原有逻辑。

真实页面当前显示 Fridges (1)、TVs (1)，各只有一个带有效参数的 checkbox。新增回归断言验证无重复分类 label/value、无 Collection 目录行；修复前截图对应 HTML 会在重复分类断言失败，修复后未筛选页和 TVs 筛选页均通过。下文“完整分类目录”的记录为早期方案，已被此条取代。

## 分类父级显示调整

按用户要求，集合页筛选和旧系列导航隐藏 Home appliances / Home appliance 父级标题，其子项提升到同一级，不再缩进。当前显示 8 个分类项；顶部全局菜单保持原配置。完整目录回归检查已按此例外调整。

## 完整目录回归修复（2026-11-04）

之前将目录展示绑定到 native facets + 四个入口映射，造成 `/collections/all` 没有分类组、品牌列表也不完整。本轮将“完整目录展示”与“字段映射、入口转换”分离。

- 当前菜单的 9 个分类/分组、15 个菜单品牌在 `/all`、LG 筛选、TECNO+Samsung 多选以及零结果页面均完整保留；另外保留未在品牌菜单中的实际 Vendor。
- 原菜单层级、顺序和分类占位项保留；品牌按 collection handle 去重，映射值与原生值不重复展示。
- 未映射项置灰且不携带可提交的 name/value；隐藏未知数量。原生确认的 0 才显示 0，已选项仍可取消。
- 即使未知 Brand 参数未被 Shopify 返回为 active filter，零结果也提供 Clear all 恢复入口。
- 新增 `tests/maxbuy-catalog-directory.py`，通过真实 HTML 的 Header 菜单独立核对侧栏目录；原页面会因缺失 Categories 失败，修复后的 4 种状态通过，检查未映射项禁用/无参数、无虚构计数、筛选控件无重复 ID。
- 真实响应确认：LG 为 1 件，TECNO OR Samsung 为 3 件，未知 Haier 为 0 件且保留清空入口。原有 10 项控制器测试通过；Theme Check 无新增诊断。浏览器控制连接失败后用户选择继续代码和本地响应验证，未宣称已完成实际浏览器点击或移动端视觉验收。

## 实际实现

沿用 `main-maxbuy-collection`、原商品卡、原生 paginate 和价格/库存筛选。分类和品牌都使用真实 checkbox；服务端仍由 Shopify 原生过滤执行组间 AND、同组 OR，浏览器不下载商品索引进行过滤。

- 默认池为语言路径下的 `/collections/all`；可通过 Section 的 Unified product pool 选择其他集合。
- 分类默认 `filter.p.product_type`；可一次切换为 `filter.p.m.custom.catalog_categories`。品牌默认 `filter.p.vendor`；如果 Vendor 保留供应商含义，可切换到 `filter.p.m.custom.brand`。颜色参数默认 `filter.v.option.color`，需填写后台实际单一来源参数。
- Entry mapping blocks 明确设置原集合、维度、精确 value、展示 label 和转换开关。完整目录始终读取配置的 Categories / Brands 菜单（含分组、父分类、占位项和空集合）；显式映射再将 collection handle 对应到真实字段值，并补齐菜单之外的映射项和原生值。不推测菜单标题对应的字段值。
- 已验证并启用 TECNO、Apple、LG、Samsung 四个品牌入口映射，配置位于默认 `templates/collection.json`。其他系列需核验后添加映射，不能照搬标题。
- 映射旧页首屏保持原系列内容，入口使用可取消的 checkbox。首次提交到池时跨路径整页导航；取消入口后不再补回默认值。
- 带原生 active filters 的复杂旧地址保留本地系列语义，显示进入统一池的明确链接。Sale、精选及未配置转换的系列不自动迁移。
- 池内同路径使用实际运行时 Section ID 更新包含标题、描述、面包屑、筛选、chips、结果数、卡片和分页的区域；同时更新 document.title。旧页原有 SEO title 保留。popstate 整页恢复。
- 已提交状态由 URL/服务端管理。重复参数保留多选，去重相同 name/value；变更筛选与排序删除分页和 Section 专用参数，保留预览上下文。跨路径整页导航；失败、超时、关键节点缺失回退目标完整 URL。
- 移动端修改只记草稿，Apply 提交完整表单；关闭、Cancel、Esc、遮罩关闭丢弃草稿。桌面即时提交；文本价格 debounce 300ms，滑块 change 后提交。负数、非法数、min > max 提供字段错误，0 和空边界分别保留有效语义。
- 分类/品牌在旧页隐藏数量。池内只展示平台实际 count，明确 count=0 且未选才禁用；目录补齐项没有 native count 时隐藏数量，不编造 0；未设置显式字段映射的菜单项以无 name/value 的禁用复选框展示，避免提交无效筛选。已配置映射但缺少 native count 的项保留平台参数语义。已选零结果选项可取消。
- Clear all 返回表单目标池第一页并保留排序；未转换复杂系列仍维持原范围，进入统一池使用独立链接。Reset 清空单组，手机中仅修改草稿。
- 新文案复用原 locales；新增价格错误文案已补齐全部 28 个 storefront locale。新脚本无额外依赖。

## 数据盘点与待配置项

环境：`http://127.0.0.1:9292` 的真实开发预览，默认可见环境。读取 `/products.json?limit=250` 与相关品牌集合的公开商品 JSON，仅用于核对，未修改商品。

| 项目 | 实际情况 | 后续操作 |
| --- | --- | --- |
| 统一池 | 当前 15 件可见商品；低于 5,000 件限制 | 核对 `/all` 的规则及其他 Markets 可见性，当前结论限此预览环境 |
| Product type | 15/15 为空；当前无 Product type 原生筛选组 | 运营统一分类并填入真实 Product type；如需重叠分类则统一改用分类列表 metafield，Search & Discovery 设置 OR |
| Vendor | Maxbuy Ghana Ltd 10、TECNO 2、Apple 1、LG 1、Samsung 1 | 核对 10 件公司的 Vendor 是否表示供应商；如是，使用独立品牌字段并迁移全体品牌数据，再切换 Brand source 和重新核验映射 |
| Color | 15 件均只有 Title 选项，无 Color 变体选项 | 选择真实单一颜色来源并配置数据；启用对应筛选后再验证多变体行为 |
| Brands 菜单 | 菜单名不能证明实际 Vendor value | 需将剩余品牌按真实字段值配置 Entry mapping；不能把未核实的名称当作有效筛选值 |
| 已验证品牌旧页 | TECNO 2、Apple 1、LG 1、Samsung 1；各集合商品 ID 集合与同环境 Vendor 查询相等 | 已启用四个入口转换；其他市场仍待核验，数据变更后需复核 |
| TV 旧集合 | 1 件商品，但 Product type 为空 | 保留原页面及局部筛选，不启用猜测分类映射 |
| 真实测试 fixture | 未创建或改动真实商品 | 完整 T01–T18 需授权隔离环境或补齐真实数据后执行 |

后台顺序：先确定字段 → 补全商品 → Search & Discovery 启用分类、品牌、价格、颜色、Availability → 在 Maxbuy collection 设置池和参数 → 添加完整分类/品牌目录 mappings → 比较每个旧集合与对应字段的商品 ID 集合 → 一致后开启转换。切换分类或品牌字段时须同步更新所有 mapping value、入口 URL 和测试。

未添加 App、未发布正式主题、未删除系列、未批量改商品；分类字段缺失时仍完整展示菜单目录，但未映射项置灰，不能伪装为有效筛选。

## 新入口 URL 示例

以下分类/颜色示例在当前后台尚无对应数据，不能视为已可用链接：

- 品牌入口（已验证）：`/collections/all?filter.p.vendor=TECNO`
- 分类入口（待数据）：`/collections/all?filter.p.product_type=Smart%20Phones`
- 分类+品牌（待分类数据）：`/collections/all?filter.p.product_type=Smart%20Phones&filter.p.vendor=TECNO`
- 全条件（待分类/颜色数据）：`/collections/all?filter.p.product_type=Smart%20Phones&filter.p.vendor=TECNO&filter.v.price.gte=1000&filter.v.price.lte=3000&filter.v.option.color=Black&filter.v.availability=1`

实际页面表单使用 locale-aware URL；新入口须使用当前语言路径。保留独立旧落地页 SEO 链接，不批量重定向。

## 验收证据

| 范围 | 结果 | 证据与边界 |
| --- | --- | --- |
| URL、跨路径、移动草稿、价格、失败回退、竞态 | 通过 | `node --test tests/maxbuy-catalog.test.cjs`，10 项通过。mock 测试验证控制器合同，不替代 Shopify 全量商品及真实移动端测试 |
| Theme Check | 通过（无新增诊断） | 与本轮前缓存基线按文件/规则/消息比较；全仓仍为既有 1527 errors / 208 warnings，不能宣称全仓通过 |
| JS 解析、资源构建、差异格式 | 通过 | `node --check` 源码及 min，esbuild 构建、`git diff --check` |
| DEV-14 资源 | 通过（构建）/ 待验证（CDN） | min JS 11,908 B，较 HEAD +1,747 B；min CSS 15,946 B，较 HEAD -3,802 B；未新增第三方请求。同池每次提交最多一个 Section 请求；CDN gzip/brotli 待验 |
| COL-01/02、DEV-16 标题 | 通过（已抓取页面） | `/all`：15 件、1 个 H1；TECNO+Samsung：3 件，H1 Products；TECNO+有货：1 件，H1 TECNO；LG Section：1 件，H1 LG |
| 同组 OR、跨组 AND | 通过（已有维度） | 真实 Shopify HTML，TECNO 2 + Samsung 1 的 OR 为 3；TECNO 与 Availability=1 的 AND 为 1 |
| 原生 Section 更新 | 通过（HTTP/服务端） | `/collections/all?filter.p.vendor=LG&section_id=template--24124701671527__maxbuy_collection` 返回目标 Section、LG 已选、1 件商品 |
| 旧入口与无 JS 表单结构 | 通过（LG 服务端 HTML） | 原 LG H1 和商品首屏保留；form action `/collections/all`，LG 真实 checkbox 已勾选，其他 3 个品牌可选，分类/品牌无伪造计数，Clear all 指向池 |
| COL-07/08/09、canonical、robots | 待验证（完整验收） | 沿用原面包屑/Schema/分页/canonical/robots；未改变全站 SEO 策略。当前样本均为一页，真实分页与最终 JSON-LD/SEO 检查仍需更大数据 |
| 分类清除扩大、顺序等价、分类 OR、颜色组合（T01–T18） | 待验证 | 当前分类/颜色数据为空，不能制造通过证据；URL 取消入口扩大目标路径已由控制器测试覆盖 |
| 桌面/移动、焦点、浏览器历史与 Theme Editor | 待验证（真实 UI） | 浏览器自动化连接异常，无法完成实际点击与截图；服务端 HTML 与控制器测试不能替代 UI 验收 |
| DEV-15 正式性能、多市场、多币种、多变体 | 待验证 | 未跑真实 Lighthouse；非默认货币原生价格限制和其他市场需复验 |

HTTP 证据保存在 `/private/tmp/maxbuy-catalog-*.html`；数据核对文件在同目录 `maxbuy-catalog-*-products.json`，仅为本轮临时证据。

## 回退

先在编辑器关闭 Entry mapping 的转换开关，旧页恢复原系列局部筛选；不会删除 Collection 或改变商品数据。统一池过滤与旧原生组件都保留。若撤销代码，按本轮 Catalog 文件改动逐项撤回；不要全量重置工作区，避免覆盖原有 Header、首页、产品页等未提交改动。

## 官方依据

已核查 [Storefront filtering](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering)、[Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)、[Filter value](https://shopify.dev/docs/api/liquid/objects/filter_value)、[Search & Discovery 限制](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters)。平台负责真实集合与参数查询；选项 count 不表示前端可自行推断的新增商品数。
