# 产品页移动端适配

设计：Figma YEns4cYyY3b6TNRFRds9Ql / 136:230，375px。

## 实现

- `maxbuy-product-mobile.css` 及压缩资源仅在主产品 Section 加载，规则限定到小于 768px 的产品页。
- 主图 contain、内边距约 9.7%；76px 缩略图、10px 间距、横向滚动。图库滚动计算读取实际 CSS gap。
- 标题 20px/1.2、常规字重；价格 20px；真实售价差额显示移动端 Save 标签，桌面隐藏。
- 库存条、促销、配件、数量/购买按钮、服务保障、详情折叠、锚点导航和描述表格采用稿件移动尺寸。
- 商品图片、价格、库存、颜色变体、优惠内容及政策继续读取现有数据。无颜色变体、活动或真实评论时不生成设计示例。
- 共用 Header/Footer 和评价 App 未在本轮重建；当前主商品仍显示 Vendor 而非设计稿示例分类文字。推荐区仍复用已有 Best Sellers 模块。

## 验证

- 375px 浏览器已确认标题常规字重、76px 缩略图及 Save GH₵505.00（4500-3995），数量及购买按钮布局已更新。
- 缩略图第二项点击后 activeMediaId 更新；配件复选框可选中；数量可从 1 增至 2 并恢复，未提交订单。
- Theme Check：main-product 无诊断，product-template 0 errors / 2 warnings；全主题仍有 1527 个既有错误，不代表全量通过。
- CSS 压缩、JS 语法检查、git diff --check 通过。
- 最终浏览器连接超时，最后一次样式微调后的复测以及桌面、活动/变体/评价有数据状态待验证。
- 适用条款：DEV-04/06/07/14/16/17，PDP-01/02；PDP-04、正式性能与 Rich Results 验证本轮未执行。

## Highlight Features 独立移动图片

后台已新增产品元字段 Highlight Features Mobile：`custom.highlight_features_mobile`，图片文件列表，允许 Storefront API 读取。产品编辑页可直接添加图片并调整顺序。

手机（小于 768px）优先显示移动图片列表；留空时显示原 `custom.highlight_features` 图片。两组图片不要求数量相同。只配置移动图时，两端均使用移动图；两组均为空则隐藏模块。原桌面图和现有商品内容未改。

新增元字段已在 TECNO 商品编辑页确认出现。移动图尚未上传，配置后的实际图片与排版待验证。
