# 移动端 Collection

设计：Figma YEns4cYyY3b6TNRFRds9Ql，147:5919 / 147:6443。

- 列表区域左右 13px，Banner 接近正方形，移动端使用原稿素材并保留可编辑 HTML 文案；后台配置图片时优先使用配置。
- 筛选/排序在 H1 上方，双列商品卡，黑色价格、Shop Now 按钮。实际商品、分类、品牌、数量及色板继续由 Shopify 数据决定。
- 全宽原生 dialog，顶部关闭按钮，底部 Apply Filter / Clear all；勾选和 Clear all 都只修改草稿，Apply 提交，关闭放弃草稿。
- CSS/JS 编辑源文件后使用 esbuild 生成同名 .min 文件，页面加载压缩版本。

验收：DEV-02/03/06/07/08/18：复用原生区块、表单及链接，无额外 SDK；DEV-14：构建通过；COL-02：保留唯一 H1。11 项筛选自动测试通过，diff 检查通过，本地 HTTP 响应含新图标、面板操作及商品链接。修改的 Liquid 文件 Theme Check 未报告问题，全主题仍存在原有问题。

待验证：浏览器控制读取时报 timeoutMs 错误，无法进行 375px 实际截图及真实点击验收；不得视为像素级验收通过。共用 Header/Footer 沿用现有实现，未在本次调整。
