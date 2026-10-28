# Product Overview

产品页独立 Section，读取 `product.metafields.custom.product_overview.value`，按后台列表顺序渲染，不读取产品自带描述或独立的 `custom.specifications` 字段。

每个 `product_overview_item` 条目包含：

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `heading` | 单行文本，必填 | 区块小标题 |
| `content` | 富文本，选填 | 产品介绍、Key Features 等正文 |
| `specifications` | `product_specification_item` 引用列表，选填 | 规格表的参数条目 |

规格条目用 `label` 和 `value` 两个单行文本字段；单位包含在 value 中。正文和规格列表均填写时，先显示正文，再显示规格表。

后台操作：先在「内容 → 元对象」创建激活的条目，再在产品的 Product Overview 字段选择、排序并保存。规格表内部顺序在该概览条目的 Specifications 列表调整。

空区块和缺少名称或数值的规格行不展示。Shopify 不向 Liquid 输出草稿元对象；需要展示的条目应设为激活。主题编辑器在没有有效内容时显示配置提示，店面隐藏整个空 Section。

主题编辑器可设置宽度、上下间距、规格字体、桌面一列或两列、商品信息显示与渐入动效。手机始终为一列；两列布局先从上到下填充左列，再填充右列，手机保持相同顺序。

底部分类使用关联产品系列，品牌使用产品厂商，标签使用真实产品标签。多变体产品的 SKU 沿用主题变体事件同步。数据不完整时隐藏对应信息，不填充示例内容。

## 产品描述对比版

新增独立 Section **Product Overview - Text**（`sections/product-description-overview.liquid`），直接读取 `product.description`，放在元对象版下方供对比。两者可分别在主题编辑器中隐藏。

在产品描述编辑器中使用 Heading 2、段落和普通两列表格；每行一个参数，左列名称、右列数值。正文中仅含加粗文字的独立段落可自动作为小标题，可在 Section 设置中关闭。

简单、无合并单元格和表头的两列表格自动处理为左右两组参数，手机恢复单组并保持顺序。含表头、合并单元格、标题或多列的复杂表格保留原结构并提供横向滚动。无 JavaScript 时仍显示完整的原始表格。

行颜色、文字颜色可在此 Section 设置；表格的内嵌宽度、边框和颜色由组件统一覆盖，不必在产品描述中逐行配置。
