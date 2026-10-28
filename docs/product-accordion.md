# 产品信息手风琴元字段

在 Shopify 后台「设置 → 自定义数据 → 产品」创建以下定义，再进入每个产品填写对应内容：

| 名称 | 命名空间和键 | 类型 |
| --- | --- | --- |
| Product Description | `custom.product_description` | 多行文本（Multi-line text），单个值 |
| Shipping Policy | `custom.shipping_policy` | 富文本（Rich text），单个值 |
| Return Policy | `custom.return_policy` | 富文本（Rich text），单个值 |
| Payment | `custom.payment` | 单行文本（Single line text），值列表 |

配送与退货政策保留富文本中的段落、列表、链接等格式。未填写或类型不匹配时隐藏对应行，不回退读取商店政策或页面。

Payment 每个列表项填写一个支付方式代码，按列表顺序显示图标。例如：

- `paypal`：PayPal
- `visa`：Visa
- `master`：Mastercard
- `american_express`：American Express

这里只配置该产品展示的支付标识，不会启用或改变结账支付渠道。请填写实际可用的方式。

Product Description 读取 `custom.product_description` 多行文本，保留换行并转义 HTML。未填写或类型不匹配时隐藏，不回退读取产品自带描述。标题、默认展开状态、动效在主题编辑器「Product information」块设置。
