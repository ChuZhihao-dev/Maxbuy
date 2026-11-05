# 可直接交给开发 AI 的 Shopify Collection 页面 Prompt

复制下面内容，并提供当前 Shopify 主题目录及 Collection 设计图。当前对话已经包含设计图时无需再次提供。

---

你是一名资深 Shopify Online Store 2.0 主题开发工程师。请在当前主题中实施一个通用 Collection 筛选页，按提供的设计图还原页面，并完成真实商品筛选、入口预选、状态恢复和验收。请执行实际开发，不要只返回示例代码或实施建议。

## 一、先检查项目，复用现有能力

1. 读取项目 AGENTS.md、适用的 Shopify 开发规范、主题结构、构建和检查命令。
2. 检查现有 Collection 模板、商品卡、facets JS、分页、抽屉、颜色变量和语言文件，优先扩展现有组件。
3. 识别传统主题或明确的 headless 项目。本需求默认传统主题，用 Liquid、CSS、Vanilla JS；不为页面引入 React/jQuery 或自建全店商品下载索引。
4. 检查 Category、Brand、Color 的真实来源，现有 Collection 的收录规则、统一池规模和 Markets/货币。先记录实际选择，避免后续代码同时使用多套分类来源。
5. 如果后台不可访问，继续完成可独立推进的主题实现，提交明确的后台配置与待验证清单，不伪造已完成状态。

## 二、必须实现的筛选逻辑

- Category、Brand、Price、Color、Availability 跨组 AND，同组多选默认 OR。
- 例如 `(Smart Phones OR Televisions) AND (TECNO OR Samsung) AND 价格范围 AND (Black OR White)`。
- 分类与品牌的选择顺序不影响结果。
- 入口默认勾选的分类或品牌可以取消，取消后真实商品范围随之扩大。
- 无分类、无品牌表示这些维度不限，不自动恢复默认值。
- Clear all 清除全部 filter.*、回到统一商品池第一页，保留当前有效排序。
- 结果按产品展示，不能把不同变体擅自拆成多张卡片。

## 三、明确页面架构

采用：一套可复用 Collection 模板/主 Section + 一个统一商品池 + 分类/品牌入口预选 + 原 Collection 落地页兼容。

1. 统一商品池默认 `/collections/all`，先核对是否已有自定义收录规则；所有后续筛选使用该池的原生 URL 参数。
2. 新的组合筛选入口可直接指向池路径加预选参数。
3. 保留 `/collections/smart-phones`、`/collections/tecno` 等原 URL 的服务端商品内容、独立 H1、Title、描述与面包屑。
4. 旧 Collection 用显式运营配置映射入口维度、字段参数和 value；不能从标题或 handle 猜测。
5. 旧页首次修改筛选时，将完整表单选择整页提交到统一池。保留仍勾选的入口条件；取消的入口条件必须从请求中消失。此后不再从旧入口/referrer/localStorage 补回默认值。
6. 跨 Collection 路径第一版用整页导航；同池路径内再用 AJAX。不要只 pushState 改地址却继续请求旧 Collection。
7. 旧页 facets 受当前系列限制。可以通过配置目录补齐分类/品牌选项，但旧页这两组隐藏数量；目录缺失 native count 的项不要伪造 0 或禁用。进入统一池后使用平台真实 facets/count。
8. 只有收录商品集合与映射字段一致的系列才开启入口转换。Sale、人工精选等复杂系列保留原业务语义，不强制映射。
9. 复杂旧带参链接先盘点；不能静默把旧系列范围与显式同组筛选的 AND 语义变成池中的 OR。

## 四、字段与后台配置

- Category：已有规范 Product type 且分类互斥时优先复用；若分类重叠或该字段已有其他用途，改用 `custom.catalog_categories`，类型 `list.single_line_text_field`。二选一并贯彻所有入口、表单和测试。
- Brand：Vendor 真实记录品牌时复用；否则使用统一品牌 metafield，不覆盖供应商含义。
- Color：使用现有一致的 Color 变体选项或已接入的标准颜色属性；不可用两种来源拼接一个过滤器。
- 颜色决定购买变体时优先变体级来源；若使用产品级颜色属性，不得承诺选中颜色的具体变体有货，需明确测试语义。
- Price、Availability：使用 Shopify 原生来源。可售状态不简单等于库存数量大于零，需考虑缺货继续销售。
- Search & Discovery 启用对应来源，列表分类同组选 OR；统一大小写、空格及 Color 命名。
- Collection 收录与字段值一致，分别记录人工系列差异；不擅自删除重建原系列。

基准示例：

```text
/collections/all?filter.p.product_type=Smart%20Phones&filter.p.vendor=TECNO&filter.v.price.gte=1000&filter.v.price.lte=3000&filter.v.option.color=Black&filter.v.availability=1
```

若选分类 metafield，分类参数替换为 `filter.p.m.custom.catalog_categories`。运行时以平台返回的 param_name/value 为准，示例不是硬编码依据。

## 五、状态与请求实现

- URL 是已提交状态的持久来源，支持直接访问、刷新、分享、前进后退。
- 复选框同组多值使用重复参数；URLSearchParams.append 后去重，不用 set 覆盖已选同组值。
- 所有筛选、排序变更移除 page；翻页保留筛选和排序。
- 保留语言/Markets 路径及必要预览参数；sections/section_id 只用于请求，不写入分享 URL。
- 旧页使用指向统一池的 GET 表单；入口值是可取消的真实控件，不能另加不可移除的同名隐藏默认值。提供无 JS 的 Apply。
- 同池局部更新沿用主题 facets 或 Section Rendering API；必须请求真实目标池 URL 和运行时 Section ID。
- 尽量把 H1、筛选、chips、数量、商品网格、分页置于同一主 Section，一次响应同步更新。
- 使用 AbortController 或请求编号防止旧响应覆盖新结果；只有成功响应可以提交对应 history 状态。
- 检测请求失败、超时、Section 为 null 或关键节点缺失，降级进入目标完整 URL。
- 处理 popstate、焦点恢复、aria-busy/live region、事件清理及 Theme Editor section load/unload。
- 商品来自当前请求的 collection.products 并原生 paginate；总数用 products_count，未筛选总量才用 all_products_count。筛选项用 collection.filters 的 active、param_name、value、count。
- 不在浏览器只筛当前页，不遍历全店商品求交集，不虚构计数，不依赖未经证实的 Liquid request.query_string/request.params 或解析 content_for_header。

## 六、页面设计与运营配置

- 按图实现：桌面左筛选、右商品网格，大屏默认 4 列；移动默认 2 列，筛选抽屉。
- 筛选顺序：Product Categories、Brand、Price、Color、Availability、Other。Other 没有真实过滤器时隐藏。
- 分类/品牌为 checkbox，颜色为 swatch 加可访问名称，价格包含双边滑块与最低/最高输入。
- 不写死图片、价格、商品数、币种、促销标记；复用现有真实商品卡。
- 提供 chips、单项删除、Clear all、结果数、加载、空结果与失败状态。
- 价格空值表示不限，0 合法；校验负数、非法数字、min > max。显示格式和提交金额分离；拖动释放后提交，文本输入适当 debounce。
- 金额单位沿用主题已验证的价格过滤逻辑，不直接提交 Liquid 内部金额值或解析带千位符的展示价格。
- 已选值即使 count 为 0 也允许取消；空结果不自动清空条件。
- 移动抽屉采用草稿 + Apply，Cancel/关闭丢弃草稿；不显示未经计算的草稿结果数。
- H1 规则：无分类/品牌为 All Products；仅单分类为分类名；仅单品牌为品牌名；各单选为品牌 + 分类；任一多选用 Products，条件通过 chips 展示。
- 取消入口后不得残留原分类描述、面包屑或 FAQ。
- Schema 按现有主题能力配置池路径、分页数量、列数、筛选组、组顺序/展开、颜色映射、入口映射和适用动画设置。样式使用主题变量及隔离前缀，文案进入 locales。

## 七、SEO 与平台边界

- 保留原分类/品牌独立 SEO 内容与可抓取内链，不对全部旧页强制自动重定向。
- 每页一个 H1；面包屑和 JSON-LD 与页面一致。筛选参数组合不批量新建 SEO 页面或组合 Collection。
- 保留并检查主题既有 canonical_url/robots 策略，第一版不擅自批量新增 noindex，不把所有页 canonical 到原入口或所有分页指向第一页。
- 第一版跨路径整页导航；同池 AJAX 同步 H1 和 document.title，canonical 不临时拼任意参数自指地址。
- Collection 超过 5,000 件商品、单过滤器前台超过 100 值等限制先核实。原生价格过滤在非商店默认货币下可能不显示；不能伪造可用控件。
- 超限时明确说明技术阻碍，完成可继续的部分并提供可落地替代方案；不擅自安装付费 App。
- 首屏关键图合理优先加载，其他图片延迟加载，保持现有性能和可访问性约定。

## 八、验收基准

只在已授权的隔离测试环境准备以下单变体数据；没有授权时不要创建真实商店演示商品。F 跟踪库存且关闭缺货继续销售。

| ID | Category | Brand | Color | Price | 可售 |
|---|---|---|---|---:|---|
| A | Smart Phones | TECNO | Black | 1500 | 是 |
| B | Smart Phones | TECNO | White | 1500 | 是 |
| C | Smart Phones | Samsung | Black | 1600 | 是 |
| D | Televisions | TECNO | Black | 2500 | 是 |
| E | Smart Phones | TECNO | Black | 6000 | 是 |
| F | Smart Phones | TECNO | Black | 1700 | 否 |
| G | Televisions | LG | Black | 2000 | 是 |

必须验证：

1. Smart Phones → A/B/C/E/F；再 TECNO → A/B/E/F；再 1000–3000 → A/B/F；再 Black → A/F；再 In stock → A。
2. 从 TECNO 反向选择 Smart Phones，再加相同条件，结果仍为 A。
3. 从完整条件取消 Smart Phones → A/D；重新建立完整条件后取消 TECNO → A/C。
4. 分类 Smart Phones + Televisions，再 TECNO → A/B/D/E/F，证明同组 OR。
5. LG + Smart Phones 为空；可删除条件恢复；Clear all 返回全部 7 件。
6. 直接进入旧 Smart Phones 页取消入口能看到统一池全部；增加 Televisions 能看到两类。
7. 翻页/排序/刷新/分享/前后退、快速请求竞态、请求失败、移动草稿取消、无 JS、价格边界、语言/币种、真实多变体都可验证。
8. 运行现有 Theme Check/构建及必要的真实预览检查；记录证据。无后台或预览时标记待验证，不宣称完整通过。

## 九、完成与交付要求

不要只交代码片段。请交付：实际主题改动、最终字段与路由说明、后台配置清单、数据差异清单、示例入口 URL、检查与验收结果、剩余限制和回退方式。

合理的可逆实现选择可自主完成，不为已确定需求重复请求确认。后台缺失配置不应阻止其他可完成的代码工作；但发布线上主题、安装 App、删除系列、批量修改真实商品等外部变更必须在已有明确授权范围内执行。

---

官方参考（实施时核查当前版本）：

- [Storefront filtering](https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering)
- [Search & Discovery 配置与限制](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-filters)
- [Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)
- [Liquid filter_value](https://shopify.dev/docs/api/liquid/objects/filter_value)
- [Liquid collection](https://shopify.dev/docs/api/liquid/objects/collection)
