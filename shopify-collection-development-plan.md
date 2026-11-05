# Shopify Collection 筛选页完整开发方案

适用场景：传统 Shopify Online Store 2.0 主题；以用户提供的筛选页设计图为视觉参考。

交付状态：开发方案与验收规范，尚未读取真实主题、后台配置或商品数据。本文中的字段及文件名是实施建议；实际开发应先核对现有项目。

## 1. 已确定的产品行为

采用“一套通用 Collection 模板 + 一个统一商品池 + 分类/品牌入口预选 + 原有落地页兼容”的架构。

- Category、Brand、Price、Color、Availability 不同组之间取 AND 交集。
- 同组多选默认 OR：例如 TECNO 或 Samsung，再与所选分类相交。
- 默认勾选的入口条件可以取消；取消后必须扩大真实查询范围。
- 分类与品牌的选择顺序不影响结果。
- URL 记录已提交状态，刷新、分享、前进与后退可以恢复。
- 现有分类和品牌 Collection 可以保留；不为每一种筛选组合创建 Collection。
- 以产品为列表单位；不同颜色变体不会自动变成多张商品卡。

逻辑表达：

```text
结果 = 统一商品池
     ∩ (所选分类之一；未选则不限)
     ∩ (所选品牌之一；未选则不限)
     ∩ 价格范围
     ∩ (所选颜色之一；未选则不限)
     ∩ 库存条件
```

组间 AND、同组默认 OR 是 Shopify 原生筛选能力。本项目保持这一行为，避免将所有复选框误做成 AND。[官方筛选机制](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering)

## 2. 页面职责与路由

| 页面 | 主要职责 | 首屏商品范围 | 后续筛选方式 |
|---|---|---|---|
| `/collections/all` | 统一商品筛选 | 商品池全部商品或 URL 指定的交集 | 原生 `filter.*` 参数 |
| `/collections/smart-phones` | 分类落地页、SEO、旧链接兼容 | 该 Collection 的商品 | 首次改变筛选时携带有效条件整页进入统一池 |
| `/collections/tecno` | 品牌落地页、SEO、旧链接兼容 | 该 Collection 的商品 | 同上 |
| 其他分类/品牌 Collection | 同类入口 | 各自 Collection | 只有配置了映射且商品集合一致时才启用统一池转换 |
| Sale、人工精选等复杂系列 | 保留原业务含义 | 原系列范围 | 默认保留原生局部筛选，不擅自映射为一个分类或品牌 |

`/collections/all` 为默认示例路径。实施前核对它是否已有自定义收录规则，以及当前语言、市场下可见商品数量。如果改用专门的 catalog Collection，所有路由与配置统一替换。

### 2.1 新入口

进入“组合筛选”的分类卡片或品牌卡片，可以直接链接统一池预筛选 URL。菜单和内容里的独立 SEO 落地页链接继续保留，二者的用途在运营配置中明确区分。

### 2.2 旧落地页兼容

以直接访问 `/collections/smart-phones` 为例：

1. 服务端正常渲染 Smart Phones 系列的商品、标题、描述和面包屑。
2. 从显式配置读取入口映射，Category 的 Smart Phones 复选框显示为已选；这属于入口条件，不是假装 Shopify 已返回了一个原生 active filter。
3. 用户首次修改筛选，表单以统一池为 action，提交当前完整选择。第一版使用整页导航，确保商品、head 信息及面包屑一致更新。
4. 如果入口条件仍勾选，提交时保留；用户取消它则不提交。不得在提交完成后再次自动补回入口值。
5. 进入统一池以后，所有已选状态由 URL 和服务端原生过滤结果决定，不再读取原入口或 referrer 恢复默认值。

同样，从 TECNO 页进入时，Brand 默认选中 TECNO；再勾选 Smart Phones 后，与反向流程进入完全相同的交集。

**不能只把框取消、仍请求旧 Collection；也不能只把浏览器地址改成 all，实际继续请求旧路径。** 原生 Collection 模板的商品范围仍然是当前系列。[模板上下文](https://shopify.dev/docs/storefronts/themes/architecture/templates/collection)

### 2.3 旧页筛选选项与计数的边界

旧 Collection 的原生 facets 只描述该 Collection，不能充当全店 facets。

- 分类、品牌的可选入口清单可以从运营维护的映射 blocks 生成，使旧品牌页也能显示其他品牌，旧分类页也能显示其他分类。
- 在旧页的 Category、Brand 两组统一隐藏数量，避免把“当前系列中没有该值”错当成“统一池里该条件为零”。
- 其他组可以使用当前系列原生值与计数，但不要宣称这是全店计数。
- 不得把不在旧页 facets 中的全局入口禁用为零；它应当能提交到统一池。
- 进入统一池后，常规筛选值、active、count 以 Shopify 返回为准。若某组全局目录需要补齐缺失项，未返回的数量视为未知并隐藏，不编造 0 或全店总数。
- 第一版不承诺旧地址首屏与统一池拥有完全相同的所有计数。若未来强制要求一致，应增加统一池首屏请求及加载方案，单独验收。

## 3. 商品字段与数据治理

### 3.1 字段选择

先盘点现有字段；已有一致、可靠的数据应优先复用。不要同时维护两套含义相同的分类字段。

| 维度 | 第一优先方案 | 何时使用备选 |
|---|---|---|
| Category | 已有规范化 Product type，且每件商品只需一个店铺分类 | 有重叠分类、现有 Product type 另有用途时，用 `custom.catalog_categories`，类型 `list.single_line_text_field` |
| Brand | Vendor，前提是它真实代表品牌 | Vendor 记录供应商或需品牌翻译时，使用统一品牌 metafield |
| Price | 原生价格过滤 | 本阶段不自建价格索引 |
| Color | 现有一致的 Color 变体选项或已接好的标准颜色属性 | 不混用两种来源拼成一个过滤器；按数据盘点统一 |
| Availability | 原生可售状态 | 不用标签模拟库存 |

本文 URL 以 Product type = `Smart Phones`、Vendor = `TECNO`、Color = `Black` 为基准。如果实施选择分类 metafield，需一次性替换全部映射、URL、表单、测试与运营说明。

Shopify 支持单行文本列表等类型作为筛选来源；适用类型的 metafield 也可用于自动收录商品。[筛选来源](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters)、[Metafield 收录条件](https://help.shopify.com/en/manual/custom-data/metafields/collections)

### 3.2 示例商品数据

```json
{
  "product_type": "Smart Phones",
  "vendor": "TECNO",
  "options": [{ "name": "Color", "values": ["Black", "White"] }]
}
```

采用自定义分类列表时，对应数据示例为：

```json
{
  "namespace": "custom",
  "key": "catalog_categories",
  "type": "list.single_line_text_field",
  "value": "[\"Smart Phones\"]"
}
```

### 3.3 一致性规则

- 统一大小写、空格、单复数、Color/Colour 命名；展示 label 和提交 value 可以分开，但映射必须明确。
- 如果颜色决定购买变体，应优先使用变体级颜色来源，并验证与价格、可售状态的组合。仅使用产品级颜色属性时，不能据此保证选中的具体颜色变体有货。
- 使用独立字段表达分类与品牌，不靠产品标题猜测。
- Smart Phones 系列应与分类字段的对应商品集合一致；TECNO 系列应与品牌字段一致；比较必须在同一市场、发布渠道及商品可见性环境下进行。
- 已有人工系列存在漏收或特殊排除时，应先记录差异，再决定是否调整；不能直接假设它等同于一个字段值。
- 对适合自动收录的系列，建议用同一商品字段定义规则；不强行把无法原位转换的人工系列改成自动系列。
- 新商品上架流程补齐分类、品牌、颜色与库存设置，避免新商品无法进入预期筛选结果。
- 库存使用 Shopify 可售语义；如果开启缺货继续销售，零库存仍可能可售。验收时记录设置，不把 availability 简单等同于数量大于零。

### 3.4 后台配置清单

1. 确认主题支持原生 storefront filtering。
2. 在 Search & Discovery 中启用 Category 对应来源、Brand、Price、Color、Availability。
3. 如采用分类列表字段，确认同组逻辑为 OR。
4. 调整组顺序，设置真实颜色展示值；如需合并同义色，记录分组与提交值。
5. 配置分类与品牌入口映射。
6. 核对统一池商品数、筛选值数量与实际货币环境。

这些是实施阶段的商店配置项；本文不代表已执行。主题代码可以先完成并在预览主题验证，后台缺失项单独标记为待配置。

## 4. URL 与状态合同

### 4.1 基准参数

| 条件 | 参数 |
|---|---|
| 分类（Product type） | `filter.p.product_type=Smart%20Phones` |
| 分类（metafield 备选） | `filter.p.m.custom.catalog_categories=Smart%20Phones` |
| 品牌（Vendor） | `filter.p.vendor=TECNO` |
| 最低价 | `filter.v.price.gte=1000` |
| 最高价 | `filter.v.price.lte=3000` |
| 黑色（Color 选项示例） | `filter.v.option.color=Black` |
| 可售 | `filter.v.availability=1` |
| 排序 | 使用 `collection.sort_options` 支持的 `sort_by` 值 |
| 分页 | 使用平台生成的分页 URL |

运行时优先使用 Shopify 返回的 `param_name`、`value` 与原生链接，不用前台翻译后的 label 反推参数。

### 4.2 完整示例

```text
/collections/all?filter.p.product_type=Smart%20Phones&filter.p.vendor=TECNO&filter.v.price.gte=1000&filter.v.price.lte=3000&filter.v.option.color=Black&filter.v.availability=1
```

同组多选建议重复参数，使用 `URLSearchParams.append`，不能误用 `set` 覆盖前一个值：

```text
filter.p.vendor=TECNO&filter.p.vendor=Samsung
```

### 4.3 状态规则

- URL 是已提交状态的持久来源；移动端未点 Apply 的选择只是草稿。
- 旧落地页第一次交互前，界面状态为“原生已选条件 + 显式入口映射”。合并后去重；修改以用户当前表单选择为准。
- 入口预选只从已配置的 Collection 映射读取；不从标题、referrer、localStorage 猜测。
- 新入口是独立浏览动作，默认只携带该入口的预选，不无条件继承用户上次浏览的条件。
- 筛选、排序改变后移除 `page`；翻页保留筛选和排序。
- Clear all 清空所有 `filter.*` 并回到统一池第一页，保留当前有效排序；Reset 单组只移除该组。
- 分类清空而品牌仍在时，展示所有符合剩余条件的该品牌商品；两组均空仍保留其他已选维度。
- URL 参数顺序不同、同组值顺序不同，不改变结果；不得重复插入相同 name/value。
- 保留当前语言、Markets 路径和开发预览参数；请求专用 `section_id`、`sections` 不写入浏览器可分享地址。
- 不给任意未知参数赋予筛选含义，不接收外部传入任意跨域查询目标。

### 4.4 核心伪代码

```text
onFilterCommit:
  state = readAllCheckedInputsAndValidPriceFields()
  target = localeAwareConfiguredPoolURL()
  addEverySelectedFilterValue(target, state) // repeated keys allowed
  preserveValidSortAndNecessaryContext(target)
  removePaginationAndSectionRequestParams(target)

  if currentPath != targetPath:
    performFullPageNavigation(target)
  else:
    requestAndReplaceCollectionSection(target)
    onSuccessPushHistory(target)
    onFailurePerformFullPageNavigation(target)
```

旧页无 JS 时仍提供 `method="get"` 且 action 指向统一池的完整筛选表单与 Apply 按钮；入口条件用可取消的真实表单控件表达，不再叠加一个无法取消的同名隐藏字段。

旧落地页的原分页链接保留原系列上下文，入口条件不作为额外 query 重复叠加。已经存在的复杂旧带参链接要单独盘点；不要把冲突的“旧系列范围 AND 显式同组筛选”静默解释为统一池 OR。此类链接应保留原生语义并提供进入统一筛选的明确入口，直到迁移规则核定。

## 5. 页面与交互规范

### 5.1 桌面端

- 大屏左侧筛选、右侧商品网格；以设计图为基准，默认 4 列商品，中等宽度按空间降为 3 列或 2 列。
- 筛选组顺序：Product Categories、Brand、Price、Color、Availability、Other。
- 分类与品牌用 checkbox；Color 用可访问的颜色 swatch + 名称。
- 提供已选条件 chips、单项删除、清除全部及筛选后商品数。
- Other 只承载已启用的真实扩展过滤器；为空时隐藏，不做空壳交互。
- 保留现有商品卡片、价格、促销与图片逻辑；设计图重复展示的三星手机仅为视觉示例，不写入真实页面。

### 5.2 标题与内容

旧落地页首屏使用其独立标题与描述。统一池标题建议：

| Category | Brand | H1 |
|---|---|---|
| 未选 | 未选 | All Products |
| 单个 | 未选 | Smart Phones |
| 未选 | 单个 | TECNO |
| 单个 | 单个 | TECNO Smart Phones |
| 任意一组多选 | 任意 | Products；详细条件通过 chips 展示 |

统一池的 H1 和结果概述放在被更新的主 Section 内。`document.title` 依据同一服务端状态更新。不要继续显示已取消分类的描述、FAQ 或面包屑。第一版跨 Collection 使用整页导航，避免旧 head 与新内容错配。

### 5.3 移动端

- 商品列表默认 2 列；筛选按钮打开抽屉，排序可沿用原主题模式。
- 抽屉内修改为草稿；点击 Apply 一次提交完整状态。
- 关闭或 Cancel 丢弃未提交草稿；重新打开以当前 URL 状态初始化。
- 已提交结果数量为真实数；第一版不显示未经服务器计算的草稿预览数量。
- 支持 Esc、焦点圈定、关闭后焦点返回；抽屉和表单控件有清楚的可访问名称。

### 5.4 价格、库存与空结果

- 最低/最高价输入与滑块同步，提交原始金额值，显示使用现有 Shopify money 格式。
- 复用主题现有价格过滤的金额单位与小数换算；不能把 Liquid 内部金额值直接当作 URL 金额，也不能从带千位分隔符的展示字符串直接解析提交值。
- 空边界代表不限，0 是合法数值；拒绝负数、非法数字及 min > max，并显示可理解的字段错误。
- 输入 debounce 可设约 300ms；拖动滑块在释放后提交，减少无效请求。
- In stock 与 Out of stock 可同组选中；表示匹配任一可售状态，不对结果额外强加隐含库存约束。
- 0 个结果时保留当前条件与删除入口，显示清除建议，不自动移除用户条件。
- 原生已选值即使 count 为 0 仍允许取消；不能把已选条件锁死。
- 颜色、价格、库存存在变体差异时，以原生返回的产品结果与匹配变体为准，验证商品卡图片、价格及链接的含义；不能凭前端其他变体的值二次过滤。

## 6. Shopify 主题实现

### 6.1 技术路线与复用

使用现有 Liquid + CSS + Vanilla JS，沿用主题的原生筛选、商品卡、分页、抽屉和断点体系；不为该页面引入 React、全店商品下载或自建浏览器筛选索引。

先检查已有 `main-collection-product-grid`、`facets`、`product-card`、`pagination` 等实现。能扩展则扩展，避免复制一套平行组件。

以下为建议职责，不是强制新建文件清单：

```text
templates/collection.catalog.json       通用筛选模板（需要时新增）
sections/main-catalog.liquid            头部、筛选、结果、分页的主 Section
snippets/catalog-facets.liquid          原生值与必要的入口目录
snippets/catalog-entry-context.liquid   旧 Collection 的显式入口映射
assets/catalog-filters.js               状态提交、局部更新、抽屉
assets/catalog-filters.css              隔离样式
locales/*.json                         面向顾客的可翻译文案
```

多个 Collection 共用模板或同一主 Section。不要为每个品牌、分类复制模板；运营映射属于数据配置。

### 6.2 Section 配置

建议配置：统一池 Collection/路径、每页数量（例如 16/24/32）、桌面/移动列数、筛选组显示、默认展开组、侧栏宽度、chips、抽屉行为、组标题、颜色映射、旧入口映射 blocks。动画开关及速度仅在组件确有动画时提供。

入口映射 block 至少包含：

```json
{
  "source_collection": "smart-phones",
  "dimension": "category",
  "param_name": "filter.p.product_type",
  "value": "Smart Phones",
  "label": "Smart Phones",
  "enable_pool_transition": true
}
```

实际 schema 优先使用 Collection picker 和已限定的维度选项。原始参数映射作为技术配置，避免让顾客接触。不要用 `collection.title | handleize` 猜测筛选 value。

### 6.3 服务端结果

- 商品来自当前请求路径下的 `collection.products` 并使用原生 paginate。
- 筛选结果数量使用 `collection.products_count`；需要未筛选总量时才使用 `all_products_count`。
- 正常 facets 使用 `collection.filters`；读取 `active`、`param_name`、`value`、`count`，不从本页卡片数量计算全局数据。
- 统一池的数量代表其当次返回的过滤上下文，不保证等于“再勾这个值之后新增的商品数”；直接保留平台语义。
- 不用 Liquid 遍历全部商品或 collection memberships 来模拟任意 Collection 交集。
- 不使用未经证实的 `request.query_string`、`request.params` 等能力，不解析 `content_for_header` 偷取查询参数。

结果数量与筛选值对象分别见 [collection](https://shopify.dev/docs/api/liquid/objects/collection) 和 [filter_value](https://shopify.dev/docs/api/liquid/objects/filter_value)。

### 6.4 局部更新与可靠性

1. 第一版跨路径变化全部整页导航；同一统一池路径内使用现有 facets JS 或 Section Rendering API。
2. 请求以实际目标池 URL 为上下文，附加真实运行时 Section ID；不能假定其他模板使用相同动态 ID。
3. 最好将筛选、chips、结果数、网格、分页、H1 合并在同一主 Section 内，确保一次响应同步替换。
4. AbortController 或递增请求编号保证只有最新响应可以更新 UI 与 history。
5. 在加载时保留旧结果并标记 `aria-busy`，防止布局跳动；成功后公布结果数。
6. 检测非 2xx、超时、缺失关键节点及 `section = null`；失败时进入目标完整 URL。
7. 监听 popstate，恢复 URL 对应的结果，不再次 pushState 形成循环；最简可靠降级为整页导航。
8. 替换 DOM 后保留适当焦点、抽屉状态与折叠状态，避免重复注册事件。
9. Theme Editor 的 section load/unload 与重复实例能够正确初始化和清理。

Section Rendering 在请求页面上下文执行；其 JSON 响应可能 HTTP 200 但某个 Section 为 null，且请求应保留 locale 路径。[官方 API](https://shopify.dev/docs/api/ajax/section-rendering)

## 7. SEO、可访问性与性能

### 7.1 SEO 处理

- 保留原分类、品牌 URL 及独立 Title、H1、描述、面包屑。
- 不对全部旧 Collection 做自动跳转；保留可抓取的落地页内链。
- 统一池参数组合用于用户筛选，不批量作为新的 SEO 落地页提交；有独立搜索需求时再建立真实专题系列。
- 优先保留主题既有 `canonical_url` 与 robots 策略，并核查最终 HTML。新增 canonical/robots 定制属于单独、明确的 SEO 变更，不由前端 JS 临时补救。
- 不机械把所有页 canonical 到用户的原入口；取消分类后原入口已不再代表当前内容。
- 不把所有 page=2 等分页机械指向第一页；保留真实可抓取分页和主题现有规范化逻辑。
- 每页一个可见 H1；面包屑文字与 JSON-LD 一致。不编造评价、库存或 FAQ。
- 第一版同池 AJAX 更新 H1、结果及 document.title；canonical 按服务端既定策略输出，不把任意参数组合拼成自指 canonical。

Shopify 提供当前页面的 `canonical_url` 对象，但其具体项目行为仍应查看最终输出。[对象说明](https://shopify.dev/docs/api/liquid/objects/canonical_url)

### 7.2 性能与样式

- 复用主题变量、商品卡片与抽屉；自定义 CSS 使用项目/BEM 前缀。
- 首屏关键商品图根据实际布局优先加载，非首屏图片 lazy-load；输出宽高与合理 sizes。
- 不给全部图片加 preload，不添加与任务无关依赖。
- 记录新增脚本体积与请求数量；按现有构建压缩资源，实际检查 CDN 传输。
- 可访问表单 label、fieldset/legend、checkbox、按钮状态、键盘焦点及结果 live region 必须完整。

适用规范重点：DEV-02/03/04/06/07/11–18/20，COL-01/02/04/07/08/09/11；完整适用性按真实修改范围记录。正式性能验收按既有项目要求在真实预览环境进行，不能把空页面测试当成最终交付证据。

## 8. 平台适用条件

- 开发前检查统一池在当前可见环境中的规模；Collection 超过 5,000 件商品时原生筛选不显示。
- 单个筛选前台最多显示 100 个值；当前方案不依靠无上限品牌清单。
- 原生价格过滤在非商店默认货币下可能不显示；前台不伪造一个看似有效的价格筛选。若业务必须跨货币价格过滤，应作为单独索引/筛选方案评估。
- Vendor 值的翻译存在限制；需要品牌本地化时在字段设计阶段处理。

以上为当前官方限制，实施时再次核实。[Search & Discovery 限制](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters)

如果超限，先记录限制并完成不依赖该能力的主题工作；提出按业务拆分商品池或专门索引服务的方案。不得通过前端只筛当前页来伪装完成，也不因超限直接安装付费 App。

## 9. 可复现验收数据

以下仅为隔离测试环境的 fixture，不得未经授权在真实商店创建演示商品。默认每个 fixture 单一变体；F 跟踪库存且关闭缺货继续销售。

| ID | Category | Brand | Color | Price | 可售 |
|---|---|---|---|---:|---|
| A | Smart Phones | TECNO | Black | 1500 | 是 |
| B | Smart Phones | TECNO | White | 1500 | 是 |
| C | Smart Phones | Samsung | Black | 1600 | 是 |
| D | Televisions | TECNO | Black | 2500 | 是 |
| E | Smart Phones | TECNO | Black | 6000 | 是 |
| F | Smart Phones | TECNO | Black | 1700 | 否 |
| G | Televisions | LG | Black | 2000 | 是 |

价格以商店默认货币计；测试基准统一使用价格范围 1000–3000（含边界）。

### 9.1 核心测试流程

| 编号 | 操作 | 期望商品 |
|---|---|---|
| T01 | 全部商品，无条件 | A B C D E F G |
| T02 | Smart Phones 入口 | A B C E F，分类已选 |
| T03 | T02 选 TECNO | A B E F |
| T04 | T03 设价格 1000–3000 | A B F |
| T05 | T04 选 Black | A F |
| T06 | T05 选 In stock | A |
| T07 | 清空后 TECNO 入口 | A B D E F，品牌已选 |
| T08 | T07 选 Smart Phones | A B E F，与 T03 相同 |
| T09 | T08 重做价格、Black、In stock | A，与 T06 相同 |
| T10 | 从 T06 取消 Smart Phones，保留其他条件 | A D；证明真的解除分类范围 |
| T11 | 重新建立 T06，取消 TECNO，保留其他条件 | A C |
| T12 | 清空后选 Smart Phones + Televisions，再选 TECNO | A B D E F，同组 OR |
| T13 | 清空后选 Smart Phones，再选 TECNO + Samsung | A B C E F，同组 OR |
| T14 | 清空后选 TECNO + White + 1000–3000 + In stock | B |
| T15 | 清空后选 LG + Smart Phones | 空结果，仍可删除条件 |
| T16 | Clear all | A B C D E F G，第一页 |
| T17 | 从旧 Smart Phones 页取消入口分类 | 统一池中全部商品；不得重新默认选中 |
| T18 | 从旧 Smart Phones 页新增 Televisions | 统一池分类 OR，展示两类商品 |

### 9.2 扩展检查

- 用更大的隔离样本验证筛选发生在所有结果上，而非仅可见卡片；翻页无重复/遗漏，排序保留条件。
- 将每页数量设小以触发分页；第 2 页修改筛选/排序应回到第 1 页。
- 直接打开完整参数 URL、复制到新标签、刷新、浏览器前后退，条件与商品集合一致。
- 快速连续变更，旧请求不得覆盖新结果；网络失败、Section null 均能降级。
- 移动抽屉取消不提交，Apply 一次提交，chips 删除及 Clear all 正确。
- 价格 0、空边界、非法值、min > max；真实多变体的颜色/价格/库存组合及卡片目标变体。
- 无 JS 的 GET 表单可完成筛选；键盘与屏幕阅读器状态可理解。
- 语言/Markets 路径、默认与非默认货币、预览链接保持有效。
- 旧页独立 SEO 内容保留；进入统一池后不残留旧分类内容。
- Theme Editor 可配置、多实例不互相污染；真实商品数量和价格不写死。

验收记录使用“通过 / 未通过 / 待验证 / 不适用 + 证据”。无法访问后台或真实预览时标记待验证，不能声称完整验收通过。

## 10. 实施顺序与最终交付

1. **盘点**：读取 AGENTS.md、相关开发规范、主题结构、现有 facets、商品字段、Collection 收录规则、市场/货币与商品数。
2. **确定合同**：写明最终使用的分类字段、品牌字段、颜色来源、池路径、入口映射和旧页兼容模式。
3. **完成基础链路**：原生 GET 表单、服务端过滤、入口转换、清除全部、排序与分页。
4. **完成页面**：按图实现响应式布局、颜色、价格、已选条件、空态与抽屉。
5. **增强体验**：同池 AJAX、并发控制、popstate、可访问性与错误降级。
6. **预览验收**：运行已有 Theme Check/构建，执行矩阵，核对 HTML、SEO 与性能证据。
7. **交付**：主题改动、配置操作清单、数据差异清单、入口链接样例、验证记录、回退方法与剩余待办。

本次方案不需要删除现有 Collection、迁移原 URL 或批量创建组合系列。实施可先在未发布主题完成；发布主题、安装 App 和批量修改真实商品数据需处于用户明确授权范围内。
