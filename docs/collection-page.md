# Collection 页面：设计对比、开发方案与验收

设计：Figma `YEns4cYyY3b6TNRFRds9Ql`，节点 `86:3995`（1440 × 4189）。

## 1. 逐项对比与复用决策

| 区域 | 设计稿 | 现有实现 | 本次方案 |
|---|---|---|---|
| 全局 Header / Footer | 与首页一致 | 已有全局组件和移动抽屉 | 原样复用，不重复建设 |
| 页面背景 / 宽度 | 浅灰背景，1232px 内容 | 集合 Banner 与列表全宽 | 专属 Collection 容器，最大1232px；小屏缩小边距 |
| 面包屑 | 稿件误用了产品路径 | breadcrumbs 已有集合路径 | 复用 breadcrumbs 和其现有 Schema，路径使用真实集合名 |
| Banner | 1232×243、圆角、背景图片+独立HTML文案与按钮 | 原集合封面高450px，标题叠图；品牌集合图片可能是logo | 独立促销 Banner，支持图片/移动图片、文字、链接配置；默认使用设计原图，绝不拿品牌logo拉伸为促销背景 |
| 列表标题 | Smart Phones，20px粗体 | 标题在大封面中 | 用真实 collection.title，移到列表工具栏并输出唯一H1 |
| SEO 描述 | 稿中未展示 | 旧 Banner 可配置描述块 | 当前集合 description 非空时显示，支持开关，不伪造文案 |
| 筛选布局 | 左栏267px，列间约49px | 原生 facets 支持aside/drawer/above；当前配置drawer | 数据仍读 collection.filters；实现隔离的原生表单/响应式抽屉，避免改动全站facets控制器 |
| 筛选维度 | 分类、品牌、价格、颜色、库存、Other | Shopify Search & Discovery 返回真实维度 | 按后台返回的筛选名称、顺序、类型渲染，不硬编码示例选项/数量；没配置的筛选不制造 |
| 分类入口 | 复选框表达类别筛选 | Series后台菜单是页面导航，不是商品属性过滤 | 真正分类筛选用后台商品分类/类型；另支持选择菜单作为集合跳转入口，导航用链接、当前项标记，不冒充交叉筛选 |
| 价格 | 双滑块、两输入框；稿中两处均写To | 原有price_range对象、价格/币种格式 | 原生双range与From/To输入同步、限制min≤max；按店铺货币展示，使用真实range_max |
| 颜色 | 两排色点 | 平台filter.presentation/swatches | 有后台swatch时显示真实色点或图片；无swatch显示文字，保留可访问名称及选中态 |
| 商品网格 | 四列、每页16、间距12、白卡8px圆角 | 当前每页30、桌面6列、手机1列 | 默认16、桌面4列、移动2列；后台可调；平板适配，不硬塞4列 |
| 商品卡 | 商品图contain、两行标题、红价、划线原价、红色标签；无购买按钮 | best-sellers-card→product-card已复用商品/价格、隐藏价格规则及真实标签 | 扩展现有best-sellers-card一个列表模式，保留product-card与价格实现，只隔离布局和移除列表购买按钮；禁止虚构折扣/标签 |
| 排序 | Sort by + Best selling | results.sort_options与原排序接口 | 使用Shopify sort_options，原生select支持键盘；保留过滤条件，排序回第一页 |
| 筛选更新 | 静态稿未定义 | 旧facets可Ajax但缺少请求竞态/失败恢复 | 新Collection控制器使用Section Rendering、AbortController、序号检查、缓存、URL状态；旧页面不受影响 |
| 已选条件 | 稿中未画 | 旧facets有chip与清空 | 保留可移除条件、Clear all、真实结果数；点击后保持焦点和已展开组 |
| 分页 | 圆形页码、前后箭头 | 原生paginate | 真正href分页（可抓取/无JS可用），Ajax增强；保留筛选排序，回到列表标题 |
| 空/失败/加载 | 未设计 | 旧列表有空状态 | 显示真实空结果与清空入口，更新时aria-busy和柔和淡出；请求失败提示并可重试，不提交错误URL |
| 限时优惠 | 红底商品横滑区 | flash-deals完整存在 | 直接复用后台配置、倒计时与商品，无重复代码 |
| Best Sellers | 四列两行、标签页、箭头 | promotional-collections已有best_sellers_style | 直接复用现有实例与数据 |
| FAQ | 稿未展示 | faq Section已具备内容及FAQ Schema | 保留Theme Editor中添加原FAQ的能力，无内容不生成示例FAQ或空Schema |

## 2. 开发顺序

1. 备份工作区、记录Theme Check基线；正式主题collection配置只拉入独立目录对比，保护后台编辑。
2. 新增原生OS2 Section `main-maxbuy-collection`，将促销、描述、列表和筛选组合为同一可配置实例；保留旧Section源码及旧网格/Banner完整配置（模板中停用，便于回退）。
3. 扩展已有商品卡模式，只对本模块加载专属样式；复用原商品价格、图片、登录价格权限和商品URL。
4. 筛选以一个表单为唯一状态源：桌面侧栏、手机同一DOM抽屉，避免双表单不同步。勾选即更新，价格输入debounce；手机可关闭抽屉查看结果。普通GET提交作为无JS回退。
5. 列表请求只替换当前Section的动态区域；保留Banner/全局Header，保留筛选展开状态及焦点；防止过期响应覆盖新选择。历史返回/前进重新加载相同URL条件。
6. 用CSS过渡呈现抽屉、筛选组和加载状态，遵循prefers-reduced-motion；Escape、遮罩关闭、Tab焦点约束、关闭后焦点归位；桌面切换清除锁屏。
7. 桌面/移动、价格边界、复选、排序、分页、空结果、无筛选集合、历史返回、连续快速操作、请求失败、Theme Editor重载逐项检查。
8. 对比Theme Check基线与最终诊断，核对真实H1/面包屑/分页URL/图片；保留预览和验收记录。正式发布与线上性能验收另行执行。

## 3. 数据与配置边界

- 商品、价格、数量、库存、标签来自Shopify；Figma重复手机和187/214等仅作为视觉示例。
- 本次不安装App、不修改商品数据或Search & Discovery设置。Brands 产品系列导航直接读取后台菜单并完整展示；若需在当前集合内使用 Brand/Color/Product type 属性筛选，需要运营在 Search & Discovery 配置。
- Banner文案为可编辑设计默认值，活动上下线应由运营按真实优惠调整。
- 影响范围：默认collection模板；首页/PDP/搜索页/既有移动菜单不改动。主题编辑器可添加/移除其他现有Section。
- 适用条款：DEV-02～08、11～18、20，COL-01～09；DEV-14/15传输压缩和正式性能报告需线上环境单独验证。

## 4. 最终实现与运营方法

- 新 Section：`sections/main-maxbuy-collection.liquid`；筛选与分类递归分别在 `snippets/maxbuy-collection-filter.liquid`、`snippets/maxbuy-collection-categories.liquid`。
- 共享卡片新增 `collection_card` 模式；继续使用 `product-card` / `price`，隐藏原购买按钮，读取真实标签。共享卡片支持明确覆盖图片预加载，商品图片 Alt 缺失时用商品标题兜底。Collection Banner 为首屏优先图片，列表图片懒加载。
- 复用主题的 `list_product_viewed` 及 Shopify Collection Update 事件适配器；保留原价格权限和币种格式。
- 默认模板保留原 Banner、原网格全部配置，仅设 `disabled: true`；新增 `maxbuy_collection` 实例，保留原限时优惠、Best Sellers 实例及其后台配置。
- 后台打开默认集合模板 → **Maxbuy collection**：可配置 Banner 开关、桌面/手机图片、文案/按钮链接、描述开关、每页件数、两端列数、标签、菜单、筛选/排序、默认展开、动效开关/时长/延迟及提示文案。
- 分类菜单目前选用现有 **Series**，读取全部有效层级，当前实际可用入口为 Home appliances 下的 TVs / Fridges。`#` 占位叶子不会输出成可点链接。后台改菜单后自动更新。
- 当前后台属性筛选仅有 Availability / Price；Brands 产品系列导航已完整显示，不依赖 Search & Discovery。Brand、Product Categories（属性筛选）、Color 属性过滤器应在 Search & Discovery 配好商品数据后显示。属性筛选标签、选项、顺序、数量全部来自平台。
- 默认每页16件。目前总商品15件，因此默认第一页无分页；超过16件时自动出现。未通过复制商品凑齐设计稿16件。
- 促销背景是 Figma 原图，不包含文案；文字和按钮是HTML。活动内容应按真实优惠在编辑器调整。支持换图或关闭；没有把品牌集合封面logo强行当Banner。
- 现有全局Header比稿件高，页面整体起点随共享Header下移；本次未更改全站Header高度。
- 需要回退时停用 **Maxbuy collection**，恢复原 Banner 和原商品网格即可；不要同时启用两套标题/商品列表。

### 源文件与压缩文件

主题加载 `.min.css` / `.min.js`，可读源码保留在同目录。使用 esbuild 0.28.1 生成（本次使用环境已缓存的版本，无新增项目依赖）：

```sh
npx --yes esbuild@0.28.1 assets/main-maxbuy-collection.js --minify --target=es2020 --outfile=assets/main-maxbuy-collection.min.js
npx --yes esbuild@0.28.1 assets/main-maxbuy-collection.css --minify --outfile=assets/main-maxbuy-collection.min.css
```

本次生成文件约 JS 9.9 KiB、CSS 14.5 KiB。修改源文件后应重新生成。

接口依据：[Shopify storefront filter](https://shopify.dev/docs/api/liquid/objects/filter)、[filter_value](https://shopify.dev/docs/api/liquid/objects/filter_value)、[Section Rendering API](https://shopify.dev/docs/api/ajax/section-rendering)。

## 5. 验收记录（2026-10-30）

预览环境：Shopify CLI `http://127.0.0.1:9293`，开发主题 `167329955943`，真实店铺商品；未发布正式主题。开发前完整源码备份：`/private/tmp/maxbuy-collection-before/workspace.tar.gz`。正式主题配置单独拉取到 `/private/tmp/maxbuy-collection-live`，与本地collection及settings_data一致后开始开发。

| 项目/条款 | 结果 | 证据/边界 |
|---|---|---|
| DEV-02/03/04/06/07，复用与隔离 | 通过 | OS2 Section，Liquid/CSS/Vanilla JS；旧配置保留，共享商品卡仅新增可选模式，无框架/App依赖 |
| 桌面布局 | 通过 | 1440视口，促销1232×243，侧栏267，四列商品各220px、间隔12px；真实15件商品 |
| 手机/平板布局 | 通过 | 320/375/430/768无横向溢出；手机两列、侧栏改为抽屉；价格允许换行，长标题限制两行 |
| 商品数据与标签 | 通过 | 标题/图片/真实价格、划线价；只有实际带Special Offer标签的商品显示该标签 |
| 库存筛选与组合筛选 | 通过 | 15件→有货3件→有货且最高500为2件，URL与结果一致；焦点保留在原输入框 |
| 价格输入/滑块 | 通过 | 输入500后上限滑块同步500；限制上下界与min≤max；空输入不带该参数 |
| 分类菜单 | 通过 | Series有效入口TVs(1)、Fridges(1)，点击TVs显示1件真实电视；原筛选不带到另一集合 |
| 排序 | 通过 | Price descending第一件为LG 674L；保留库存/价格过滤条件；改变排序回第一页 |
| COL-09 分页 | 通过 | 开发时临时6件/页，第二页6件且当前页为2；页码真实href带sort_by；已恢复16件/页 |
| 浏览器返回 | 通过 | 排序后返回恢复title-ascending和此前的库存/价格条件 |
| 快速切换/请求竞态 | 通过 | 快速勾选/取消有货再选缺货，最终12件并对应availability=0；旧响应没有覆盖新状态 |
| 折叠与抽屉 | 通过 | 折叠Price后筛选更新仍保持折叠；手机更新后抽屉保持modal和锁屏，Escape/Show results关闭后解锁、焦点回Filters |
| 空结果 | 通过 | 最高价1显示0 products / No products found / Clear all；没有伪造推荐结果填列表 |
| COL-01/02/04/07/08、DEV-16/18/20 | 通过 | 实页唯一H1，真实集合面包屑；完整Home→Collection BreadcrumbList JSON-LD可解析；支持后台description与真实链接 |
| DEV-12/13/17 | 通过 | Banner eager/high，列表图片lazy；商品图带标题Alt，装饰图片空Alt |
| DEV-14 资源压缩 | 通过 | esbuild输出两个min文件，实际页面加载min资源，原始资源留存 |
| JS与差异检查 | 通过 | 两份JS node --check；git diff --check |
| Theme Check 增量 | 通过 | 前后均1527 errors / 208 warnings，忽略原有诊断的行号位移后没有新增问题；全主题历史错误尚未清理，不代表全量Theme Check通过 |
| DEV-05 Theme Editor实际面板/重载 | 待验证 | Shopify接受Section Schema并成功同步开发主题；编辑器网页停在95%加载/about:blank，未完成面板编辑与重载的实际操作 |
| Brand/Color筛选和无JS浏览器操作 | 待验证 | 代码支持原生GET、颜色swatch和文本回退；真实后台目前无Brand/Color维度，未在禁用JS浏览器中完整操作 |
| 网络故障注入/Retry | 待验证 | 已实现失败提示、重试/整页回退、AbortController和过期响应保护；未对真实店铺实施断网故障注入 |
| COL-05 FAQ能力 | 通过 | 继续支持添加已有FAQ Section，不制造问答内容；该Section已有对应Schema能力 |
| COL-06 FAQ Schema实例验收 | 不适用 | 当前页面无FAQ内容，未输出虚构FAQ Schema |
| DEV-14传输压缩 / DEV-15正式性能 | 待验证 | 尚未发布正式主题，未做含完整追踪环境的PSI/Lighthouse性能与CDN压缩验收 |
| 真机Safari/其他浏览器 | 待验证 | 本次实际浏览器验证为Chrome响应式视口 |

截图：`/private/tmp/maxbuy-collection-desktop-final.png`、`/private/tmp/maxbuy-collection-mobile-final.png`、`/private/tmp/maxbuy-collection-filters-final.png`。


## 6. Brands 产品系列完整展示（本次补充）

- 默认 Collection 的 Brands 菜单配置为 `brands`，名称/排序/链接/数量从后台菜单及对应集合读取，复用现有递归导航片段。
- 桌面侧栏、移动筛选抽屉均默认展开全部系列，不使用数量限制、不添加View more、不隐藏0件商品系列，也不设置列表内部高度截断。
- 当前实测15个系列：Tecno、Haier、Samsung、Infinix、LG、Apple、itel、Syinix、Binatone、Oraimo、Philips、TCL、Chigo、Asano、Midea。后台菜单增删后自动更新。
- 系列入口使用真实集合链接；当前系列以aria-current标记。支持在编辑器通过 Brands collection menu 选择其他菜单或清空隐藏该组。
- 验证通过：桌面输出15个真实链接，Brands内容max-height为none、overflow为visible；375px抽屉可滚动/键盘到末项Midea；点击Samsung正确进入/collections/samsung、保持15系列且高亮Samsung。空集合仍完整展示系列导航。
- 当前品牌集合返回的商品数均为0，照实显示；这与所有商品列表有15件商品是不同的后台集合归属数据。
- Theme Check与上次基线同为1527 errors / 208 warnings，忽略行号位移后无新增诊断；git diff --check通过。
- 本次只修改新Collection Section及模板配置与本说明；同步开发主题，未发布正式主题。截图：`/private/tmp/maxbuy-collection-brands-full.png`。
