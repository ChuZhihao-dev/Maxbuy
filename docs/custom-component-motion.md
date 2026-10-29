# 定制组件动效约定

定制组件复用 `assets/theme.js` 的共享 IntersectionObserver、主题
`anm-fade-element` / `is-visible` 状态，以及 `snippets/css-variables.liquid`
中的动效时长。补充样式集中在 `assets/maxbuy-motion.css`，不额外加载动画库。

## 入场

- 标题、文案：在合适的内容节点添加 `data-maxbuy-reveal="text"`，沿用主题
  20px 上移、700ms 淡入。
- 卡片、图片：添加 `data-maxbuy-reveal="card"`，沿用主题 500ms 卡片曲线。
  同组节点可用 `data-maxbuy-order="0"`、`1`、`2` 设置 100ms 错峰，最多延迟 500ms。
- 标记加在内容节点，不加在吸顶容器、弹窗根节点、滚动轨道或依赖 transform
  定位的元素上。已经有主题入场动效的子节点不重复包裹。
- 首屏可见内容立即显示；视口外的内容进入视口后仅播放一次。横向轮播中
  尚未进入视口的内容也由同一观察器触发。
- JS 为上述标记添加主题动画类；无 JS 时定制内容保持可读。
- 保留已有 `data-animation="false"` 开关及后台时长、延迟配置。
- 动态插入、编辑器重载及商品系列缓存使用同一注册逻辑；WeakSet 按实际节点
  去重，不把 HTML 缓存中的 `data-fade-observed` 当成有效观察器注册。

## 交互

- 图片悬停复用 `media-hyperlink` 父节点及 `anm-image-hover` 图片类，遵循
  主题全局图片动效开关，仅在桌面端启用。
- 原有主题按钮继续使用 `custom-button` 和按钮 snippet；定制按钮保留视觉和
  交互，用 `--button-animation-duration` 统一过渡时长。
- 链接、菜单、折叠交互分别使用 `--text-link-and-title-link-animation-duration`、
  `--header-menu-transition-duration`、`--dropdown-animation-duration`；
  已有运营配置优先于这些默认值。
- 减少动态效果模式下立即展示内容、停用悬停缩放与过渡，轮播和锚点保留
  现有即时滚动逻辑。

## 覆盖范围

Hero 与分类、品牌、促销系列商品、限时优惠、推荐商品拼图、促销 Banner、
门店展示、服务图标条、商品优惠、配件、服务承诺、说明折叠、文字概述、
详情图，以及页头菜单、页脚链接、商品吸顶导航、WhatsApp CTA 的交互时长。
原生商品规格区及主题标题高亮保留现有主题动效。

## 验证边界

主题静态检查与隔离浏览器验证不能代替真实商店预览。正式验收还需在
首页和有真实数据的商品页检查桌面/手机、系列切换、主题编辑器重载、
减少动态效果模式，并按 DEV-15 在真实环境验证性能。
