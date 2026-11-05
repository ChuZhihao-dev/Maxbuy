# 商品分类与品牌补齐清单

状态：已核对公开商品与现有 Collection 的真实归属；尚未写入后台。现有 Vendor、Product type 保留。

## 可直接核实的数据

建议使用独立字段 `custom.brand`（单行文本）和 `custom.catalog_categories`（单行文本列表），避免覆盖供应商信息。列表分类在 Search & Discovery 配置同组 OR。

| 商品 ID | 商品名称 | 已核实品牌 | 已核实分类 |
| --- | --- | --- | --- |
| 10278009045095 | 10000mAh 45W Fast Charging Portable Charger | 待确认 | Accessories |
| 10278007308391 | SANDISK Extreme PRO SD UHS-II V90 Card | 待确认 | Accessories |
| 10272211468391 | TECNO Camon 50 Ultra 5G 8GB+256GB | TECNO | 待确认 |
| 10266632355943 | Apple iPhone 17 Pro Max 2TB Cosmic Orange | Apple | 待确认 |
| 10266632061031 | Syinix 50″ 4K Smart TV | 待确认 | TVs |
| 10266631274599 | LG 674L Side-by-Side Refrigerator | LG | Fridges |
| 10266629374055 | Binatone Kettle CEJ-1799DW | 待确认 | 待确认 |
| 10266584055911 | Samsung Galaxy A06 – 6+128GB | 待确认 | 待确认 |
| 10266583367783 | Binatone Microwave Solo 20L | 待确认 | 待确认 |
| 10266582745191 | Tecno Spark 50 | TECNO | 待确认 |
| 10266582024295 | Oraimo Kettle 1.7L | 待确认 | 待确认 |
| 10266581008487 | Samsung Galaxy A06 – 6+128GB | Samsung | 待确认 |
| 10266580418663 | Samsung Galaxy A06 – 6+128GB | 待确认 | 待确认 |
| 10266579566695 | Samsung Galaxy A06 – 6+128GB | 待确认 | 待确认 |
| 10266335838311 | Samsung Galaxy A06 – 6+128GB | 待确认 | Smart Phones |

待确认不代表“没有品牌/分类”，不得写空值覆盖已有后台字段。下一步先读取现有 metafield、Shopify 产品分类等后台数据，再补充证据；仍无法确认的商品由运营明确归属。

## 写入顺序

1. 读取后台既有字段及定义，记录 before 值；不得直接运行覆盖未知值的批量写入。
2. 若无同义字段，创建或复用以上两个字段定义，并使 Online Store 可读取。
3. 只写已核实且不存在冲突的十条字段赋值。`verified-metafields.json` 为已准备的 mutation 参数，尚未执行；已为每项设置 `compareDigest: null`，仅允许新建；若字段已有值则整批失败而不覆盖，需读取并核对后再按实际 digest 执行。
4. Search & Discovery 启用两个字段及原价格/库存。
5. 完成后才能切换主题 source、核验 all 查询与对应 Collection 商品 ID 集合，再启用相应入口转换。
6. 剩余十件品牌缺失与十件分类缺失需独立核对；两组不是同一批商品。

## 连接状态

用户已表示连接 Shopify，但本轮工具查询仍返回该插件 not_installed，且没有提供 Shopify 数据读写工具。浏览器扩展也无法执行页面读取/点击。此文件和 JSON 是待写入清单，不是写入成功证明。


官方依据：[metafieldsSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet) 的 compareDigest 支持新建保护和并发检查；[metafieldDefinitionCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldDefinitionCreate) 用于建立字段定义。所有 JSON 均未执行。
