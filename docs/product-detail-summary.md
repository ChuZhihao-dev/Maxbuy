# 产品详情页首屏信息修正

日期：2026-11-05。目标：TECNO Camon 50 Ultra 5G 产品详情页。设计：Figma `YEns4cYyY3b6TNRFRds9Ql`，整页 `147:2262`，本次范围为商品购买信息 `147:2487`。

## 改动

- 复用 main-product 的 Labels and badges block，并补入默认产品模板，置于 Vendor 前。主产品页的两个标签采用服务端真实数据渲染：New Arrival 按发布时间起 30 天计算，期限、文字和开关可在 block 中修改；折扣按所选变体的 compare-at price 与 price 计算。没有价差时不显示折扣；价格隐藏或存在数量价格梯度时不生成该百分比。
- 标签间隔 10px；标签到 Vendor、Vendor 到标题各 10px。桌面标题为 Montserrat/body font 24px、400 字重、1.3 行高，标题后的间隔 16px。实际厂商和标题继续读取商品数据。
- 主价格为黑色、桌面 32px，划线价为灰色 16px；Save 标签在桌面和移动端都可见，按当前变体实际差额计算，不使用设计中的示例 `$100`。目标商品 4500 − 3995 = GH₵505.00，百分比标签为 -11%。移动尺寸继续沿用移动样式。
- 启用原生颜色 swatches，保留真实变体、可售状态、媒体和价格更新控制器。颜色按钮为“色点 + 名称”，选中红边；主产品页增加 Select color 标题，隐藏冗余的标题旁选中值。原生选中颜色也输出 checked 属性。quick view 的原标签样式不套用本次主产品页的名称展示。
- 按设计将颜色 block 排在促销与 Accessories 之间。
- More Accessories 显式配置链接优先；留空时使用真实存在的 Accessories 集合。没有有效集合或文案时不输出死链接。
- 主产品样式使用 `main-product.min.css`；可读源文件 `main-product.css` 保留。没有修改价格全局颜色，因此配件售价仍按原组件显示红色。

## 实际数据

初始商品只有 Default Title 变体；用户随后在后台添加了颜色变体，本轮重新读取并验证，没有由主题生成虚假颜色。

| 颜色 | 变体 ID | 可售 | 价格 / 划线价 |
| --- | --- | --- | --- |
| Red | 51158137110631 | 是 | 3995 / 4500 |
| Purple | 51158137143399 | 否 | 3995 / 4500 |
| Black | 51158137176167 | 否 | 3995 / 4500 |
| Green | 51158137208935 | 否 | 3995 / 4500 |
| Gray | 51158137241703 | 否 | 3995 / 4500 |

选项名为“颜色”，主题通过平台原生 swatch 数据识别；颜色值来自后台配置，不用设计示例覆盖。当前配件仍为真实引用的两件商品，没有修改价格、库存、活动、评论或发布信息。

## 资产核对

| 设计槽位 | 本地资产 | 自然尺寸与调用 |
| --- | --- | --- |
| 147:2494 New Arrival 折角 | assets/product-badge-new-tail.svg | 4 × 4，下载自该槽位的 Figma 导出；badges snippet 用 4 × 4 img 输出 |
| 147:2498 折扣折角 | assets/product-badge-sale-tail.svg | 4 × 4，下载自该槽位的 Figma 导出；badges snippet 用 4 × 4 img 输出 |
| 配件入口箭头 | assets/product-accessories-arrow.svg | 复用原配件组件资产与尺寸 |

商品和配件图片继续来自 Shopify。没有将 Figma 整图用作实现，也没有在运行时引用临时 Figma URL。

## 验证与边界

- 通过：目标页面真实 HTML 输出 New Arrival、-11%、Save GH₵505.00、五个颜色名称、正确选中 radio、More Accessories 真实链接、两张配件卡和唯一 H1。
- 通过：分别请求默认 Red 和 `?variant=51158137143399` 的 Purple 页面，选中颜色和价格信息与对应变体一致。测试命令：`python3 tests/maxbuy-pdp-summary.py <HTML> <product JSON> [variant ID]`。
- 通过：esbuild 压缩 main-product CSS、两张 SVG 4 × 4 根尺寸、git diff --check；修改文件无 Liquid 错误，无新增诊断类别/数量。
- 既有告警：product-template 的 LiquidComplexity 评分从 462 到 465，另有原有未使用变量告警；variant-options 原有未使用变量告警仍存在，不能宣称全仓 Theme Check 通过。
- 待验证：浏览器扩展仍报连接错误，原生浏览器控制超时；未完成本轮最终桌面/手机截图、计算样式及实际点击、键盘、加购行为验收。服务端变体 URL 验证不能替代这些 UI 证据。
- 未发布正式主题；没有提交购物车或订单。

对应规范：DEV-04/06/07/14/16/17，PDP-01。已有商品 Schema、正式性能及 Rich Results 本轮不重新验收。

## CSS 清理（2026-11-05）

合并重复的标题、厂商、图库导航及滚动提示规则；标题和厂商保留用户当前设定的 600 字重。手机标题字号、数量图标、价格行和 Save 标签的尺寸差异统一到移动样式文件，删除无效隐藏规则及重复基础声明。

使用清理前后的 CSS AST 对比，核对 375/767/768/1024/1440px 下标题、厂商、价格行、Save、按钮和图标的属性结果相同，其余选择器/媒体条件下的最终声明保持一致。该检查属于静态样式验证，不替代浏览器视觉验收。

新增 `scripts/build-product-css.sh` 统一构建两份资源，支持 `--watch=forever`。当前生成文件大小为主样式 27,875 B、移动样式 8,312 B。规则解析、压缩构建、脚本语法检查和 `git diff --check` 通过。


## 颜色边框与切换主图修复（2026-11-05）

- 主产品颜色按钮默认使用透明边框占位，仅选中时显示该选项真实的 `--swatch-color-value` 1px 同色边框，不叠加内描边，保持按钮尺寸稳定。
- 根因是图库在每次 grid 变体更新时添加 `active-product-in-grid`、`shadow-medium`，对应 CSS 执行 `shrink 1s infinite` 并显示 2px 伪元素边框。已从源事件处理、主题编辑器对应逻辑和 CSS 移除。
- 变体仍正常选择对应图片；只有实际媒体变化时才执行桌面定位，同图变体不重复滚动。缺失媒体、已移除图库及过期帧回调安全返回。点击放大、缩略图选中样式和移动端图库逻辑保留。
- `node --test tests/product-media-variant.test.cjs` 六项通过；两个 JS 语法检查、CSS 构建、生产/编辑器回调一致性与 `git diff --check` 通过。真实 Purple 页面服务器输出仍通过 PDP summary 检查。未完成本轮浏览器实际点击和最终视觉验收。

### 社交分享栏

复用主商品 social_sharing 区块，新增 Maxbuy 图标样式，并放在 Payment 下方。使用 Figma 147:2644 的七个本地 SVG，尺寸 32px；可在主题编辑器单独开关。Facebook、LinkedIn、WhatsApp、Pinterest 分享商品公开链接；YouTube、Instagram、TikTok 使用主题现有官方主页设置，未配置则隐藏。不加载第三方 SDK。

验证：CSS 构建与 diff 检查通过；本地响应显示七个链接。新 snippet 的 Theme Check 无问题，主题原有复杂度等问题仍存在。浏览器视觉与实际平台分享流程待验证。
