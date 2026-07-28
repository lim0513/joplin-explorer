# Joplin Explorer — 开发路线图

本文件展示 **Joplin Explorer** 的当前状态与未来规划。

---

## ✅ 当前功能（v1.5.x）

**树与导航**
- 笔记本 + 笔记统一树形视图，自动展开到当前笔记
- 全部折叠 / 全部展开切换
- 手动刷新按钮
- 滚动位置保持
- 实时搜索：笔记、笔记本、标签，命中高亮

**标签**
- 树下方标签分区——每个标签即文件夹，笔记懒加载
- 笔记数量徽标；空标签自动隐藏（与 Joplin 侧边栏一致）
- 拖笔记到标签即打标签；右键可重命名/删除标签、从标签移除笔记
- "显示标签分区"设置项

**收藏夹**
- 置顶笔记与笔记本，分区内拖拽排序

**排序与拖拽**
- 排序：修改时间 / 标题 / 手动（重启后保持）
- 手动排序：笔记拖到精确位置，文件夹也可拖动排序
- 拖拽移动带清晰指示、边缘自动滚动、拖到空白区新建笔记本

**右键菜单**（与 Joplin 原生菜单基本对齐）
- 笔记：打开 / 新窗口打开、设置标签、笔记待办切换、切换完成状态、移动到笔记本、创建副本、复制 Markdown / 外部链接、发布笔记、导出下钻子菜单（PDF / MD / MD+Front Matter / JEX / HTML）、重命名、笔记信息、删除（固定最后）
- 笔记本：新建笔记/待办/子笔记本、重命名、导出、删除

**回收站**（v1.5）
- 可折叠回收站分区：已删笔记本按层级嵌套、可展开查看内部笔记；已删笔记可只读打开
- 逐项恢复 / 彻底删除（文件夹级联删除）；分区头右键清空回收站——[#7](https://github.com/lim0513/joplin-explorer/issues/7)

**自动刷新**（v1.5）
- 其他插件或同步产生的变更自动出现（数据 API 变更事件轮询，设置里可关）——[#6](https://github.com/lim0513/joplin-explorer/issues/6)

**悬停预览**（v1.5.1）
- 悬停笔记显示标题、类型、大小、创建/更新时间和正文摘要（长度可配）

**智能文件夹**（v1.5.2）
- 内置最近更新、未完成待办，支持 Joplin 搜索语法自定义规则；结果条数设置、计数徽标

**笔记行徽标**（v1.5.4）
- 含 checkbox 的笔记显示完成进度饼图（原生风格，与笔记本计数对齐）
- 已发布笔记显示链接徽标，点击打开发布对话框

**分区布局**（v1.5.9）
- 通过设置重排侧栏分区（收藏夹 / 智能文件夹 / 笔记本 / 标签 / 回收站）——[#9](https://github.com/lim0513/joplin-explorer/issues/9)，感谢 [@CJeffyB](https://github.com/CJeffyB)
- 分区分割线上方间距可调

**笔记本导出修复**（v1.5.10）
- 笔记本右键导出恢复可用：下钻格式子菜单（JEX / Markdown / MD+Front Matter / HTML）+ 目录选择器；失败时弹窗提示而非静默吞掉

**导入文件**（v1.5.11）
- 笔记本右键"导入文件"：多选 txt/md，每个文件建一条笔记（标题=文件名去扩展名）。编码自适应（UTF-8，乱码回退 GBK，剥除 BOM）

**回收站与定位修复**（v1.5.12）
- 恢复"笔记本也在回收站"的笔记时，会询问是否连同笔记本一起恢复（不再把笔记静默丢到根目录）
- 点击标签下的笔记会在主树中定位并展开到它

**收缩按钮浏览修复**（v1.5.13）
- 全收缩后手动展开文件夹会让按钮翻回"收缩"态，恢复操作不再覆盖刚浏览展开的内容——[#11](https://github.com/lim0513/joplin-explorer/issues/11)，感谢 [@CJeffyB](https://github.com/CJeffyB)

**拖拽与标签修复**（v1.5.14）
- 面板拖拽携带 Joplin 原生 mime 载荷：笔记拖入编辑器可插入链接（3.7 Canvas 即插即用）——[#12](https://github.com/lim0513/joplin-explorer/issues/12)
- 收藏夹为空时拖拽期间显示临时落点，首次拖拽收藏可用——[#13](https://github.com/lim0513/joplin-explorer/issues/13)
- 已删除笔记不再出现在标签下、不再虚增标签计数——[#15](https://github.com/lim0513/joplin-explorer/issues/15)（三项均感谢 [@CJeffyB](https://github.com/CJeffyB)）

**落点跟进修复**（v1.5.15）
- 空收藏夹落点改为视口顶部悬浮显示，且注入不再破坏拖拽

**回收站嵌套折叠**（v1.5.16）
- 回收站里多层笔记本正确折叠（子笔记本随父级收起）；README 增加展示图

**Issue 批次 #16–20**（v1.5.17）
- 笔记图标可配置 + 默认 📄——[#20](https://github.com/lim0513/joplin-explorer/issues/20)；双击开新窗口——[#18](https://github.com/lim0513/joplin-explorer/issues/18)；新建笔记本调原生对话框——[#16](https://github.com/lim0513/joplin-explorer/issues/16)；展开模式修复——[#17](https://github.com/lim0513/joplin-explorer/issues/17)；折叠范围 + 仅折叠模式——[#19](https://github.com/lim0513/joplin-explorer/issues/19)（均感谢 [@CJeffyB](https://github.com/CJeffyB)）

**插件站展示**（v1.5.18）
- manifest 增加插件图标（16/32/48/128）和截图，用于插件站列表展示

**对话框与右键修复**（v1.5.19）
- 重命名 / 删除确认对话框不再截断长笔记名，文字自动换行、自适应宽度——[#22](https://github.com/lim0513/joplin-explorer/issues/22)、[#26](https://github.com/lim0513/joplin-explorer/issues/26)；重命名输入框自动聚焦并选中
- 笔记右键新增"用外部编辑器打开"——[#24](https://github.com/lim0513/joplin-explorer/issues/24)（均感谢 [@CJeffyB](https://github.com/CJeffyB)）

**全收起修复**（v1.5.20）
- "全部折叠（含分区）"时智能文件夹分区正文未一起收起（DOM id 不匹配），已修正

**智能文件夹徽标修复**（v1.5.21）
- 智能文件夹（未完成待办等）展开时，笔记右侧未显示 checkbox 进度饼图/发布徽标——初始检索缺少徽标数据，现已补齐

**自动定位与拖拽净化**（v1.5.22）
- 从面板外跳转笔记（如"转到任意"搜索）时，面板自动滚动到该笔记（仅在不可见时滚动并居中）——[#27](https://github.com/lim0513/joplin-explorer/issues/27)，感谢 [@bwat47](https://github.com/bwat47)
- 拖笔记到编辑器时不再带出内部 JSON，只插入干净的 `[标题](:/id)` 链接（内部载荷改用自定义 mime，不再污染 text/plain）——[#21](https://github.com/lim0513/joplin-explorer/issues/21)，感谢 [@CJeffyB](https://github.com/CJeffyB)

**下钻箭头放大**（v1.5.23）
- 右键"导出"子菜单的下钻三角改用实心 ▶（与文件夹展开箭头同款字形），尺寸对齐文件夹箭头（9px），替换之前太细的 ▸

**导入格式与下钻箭头**（v1.6.0）
- CSV 导入：注册为两个原生导入模块，出现在 Joplin **文件 → 导入** 列表中——"CSV - Markdown 表格"（转 Markdown 表格，列数不齐/字段含换行也能正确成表）与 "CSV - 代码块"（``` 围栏保留原始 CSV）；均支持 .csv/.tsv、编码自适应——[#14](https://github.com/lim0513/joplin-explorer/issues/14)
- HTML 及其余格式交由 Joplin 原生导入处理（图片资源化、格式最全），不再自建导入
- 下钻子菜单箭头改用纯几何 CSS 三角形，精确垂直居中（不再依赖字体字形）

**定位增强与复制笔记本 ID**（v1.6.1）
- 笔记本右键新增"复制笔记本 ID"（对齐原生侧边栏，供 Templates 等按 ID 指定笔记本的插件使用）——[#29](https://github.com/lim0513/joplin-explorer/issues/29)
- 从搜索结果打开笔记后清空搜索，树会展开并定位到该笔记（原先会跳到顶部）；工具栏新增"定位当前笔记"按钮——[#32](https://github.com/lim0513/joplin-explorer/issues/32)，感谢 [@bwat47](https://github.com/bwat47)

**浅色主题配色修复**（v1.6.2）
- 搜索框聚焦边框、拖拽落点区（虚线框与文字）此前使用 `--joplin-color2`，而该变量是 Joplin 的**侧栏文字色**（浅色主题下为白色），导致这些元素在浅色主题下几乎不可见；统一改用 `--joplin-url-color` 作为强调色，并为输入框聚焦增加高亮环 —— PR [#30](https://github.com/lim0513/joplin-explorer/pull/30)，感谢 [@bwat47](https://github.com/bwat47)

**分区标题吸顶**（v1.6.3）
- 滚动时分区标题（收藏夹 / 智能文件夹 / 笔记本 / 标签 / 回收站）吸附在面板顶部，长列表下也能随时看到并点击各分区——[#31](https://github.com/lim0513/joplin-explorer/issues/31)，感谢 [@CJeffyB](https://github.com/CJeffyB)
- 笔记本区新增分区标题（📚 笔记本 + 笔记总数徽标），可整体折叠、状态跨重启保持，并纳入"全部折叠（含分区）"范围；根笔记本相应缩进一级，与其他分区的二级项对齐

**标签分组/嵌套**（v1.6.4）
- 按可配置分隔符（设置项，默认关闭）将标签名切分为层级树显示：真实标签直接作为父节点（展开后先子标签、后笔记，与笔记本树一致）；仅作前缀的虚拟层级以 🔖 淡色行呈现，无右键菜单、拒绝拖放打标签——[#28](https://github.com/lim0513/joplin-explorer/issues/28)，感谢 [@CJeffyB](https://github.com/CJeffyB)
- 父节点徽标显示双数字 `7 (10)`：自身笔记数 +（去重后的）子树总数，两数相同则只显示一个；悬停有说明。去重所需的笔记 id 复用计数请求的返回，零额外 API 调用
- 附 `scripts/demo-nested-tags.js`：一键生成/清理覆盖各边界情况的测试数据

**其他**
- Emoji / 自定义图片笔记本图标
- 同步按钮带状态反馈
- 视图状态（文件夹/分区折叠）跨重启保持，可配启动恢复与标签默认状态
- 设置界面（图标、开关、标签分区）
- 多语言：简中 / 繁中 / 英 / 俄 / 日

---

## 🎨 v1.6 — 界面与体验选项

- [ ] 布局选项：行高、缩进深度、显示/隐藏更新时间
- [ ] 按笔记类型自动图标
- [ ] 单笔记自定义图标 + 文件夹展开/折叠成对图标（图标存入 user_data，注意滚动性能）——[#23](https://github.com/lim0513/joplin-explorer/issues/23)，感谢 [@CJeffyB](https://github.com/CJeffyB)

---

## 🧩 v2.0 — 大版本

- [ ] **Explorer API** —— 注册自定义节点、右键菜单项、程序化高亮（同时可解锁：其他插件向 Explorer 右键注入菜单项——[#24](https://github.com/lim0513/joplin-explorer/issues/24)；多选并驱动插件命令——[#25](https://github.com/lim0513/joplin-explorer/issues/25)）
- [ ] **多窗口 Explorer**
- [ ] **高级排序规则** —— 按笔记本单独设置排序、自定义比较器
- [ ] **面板布局重构** —— 各分区独立滚动——[#31](https://github.com/lim0513/joplin-explorer/issues/31)