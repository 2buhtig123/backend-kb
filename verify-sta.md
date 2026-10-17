# 时序分析文章核对报告
参考：《数字集成电路物理设计》陈春章等，科学出版社 2008，第 6 章（书页 140–168）
范围：basics/01-静态时序分析STA.md、basics/07-STA进阶篇.md、interview/01-时序专题.md

## 可背书的表述（A 类，精选 12 条）
- 时序路径四类 Reg-to-Reg / In-to-Reg / Reg-to-Out / In-to-Out，起点终点与时序要求定义与书一致（书 p.157 图6-25、表6-4）。
- Setup/Hold 定义：数据须在时钟沿之前/之后保持稳定（p.154–155）。
- Setup slack 结构：capture 时钟项为正、数据路径与 setup 时间为负，与书式 6-14a（clk_launch_edge + clk_to_q + max_combo_delay ≤ clk_capture_edge − setup）一致（p.158）。网站约定 skew = T_capture − T_launch、正 skew 帮 Setup 害 Hold，可由书式推出（p.158）。
- Hold slack 不含时钟周期项，只查最短数据路径，与书式 6-14b（launch + clk_to_q + min_combo ≥ previous_capture_edge + hold）一致（p.158）。
- Setup 修复：让时钟变慢（增长周期）或缩短数据路径延迟（p.155）；网站"增加 cycle 时间/降频"与此一致。
- Hold 修复：增长数据路径延迟，或加快时钟到达 FF2（p.156）；网站"插 Delay Cell / 加快 Capture 时钟"一致。
- 综合阶段时钟为理想化时钟，时钟到达延迟须在时钟树综合后才能准确分析——直接背书网站"Pre-CTS 不追求 Hold clean、Hold 留到 Post-CTS 修"的修正结论（p.158）。
- setup 检查典型用"最差条件"时序库，hold 检查典型用"最佳条件"时序库（p.155–156）；网站 07 篇 Q1 一致。
- 时钟插入延时（clock insertion delay）也称作 clock latency；clock uncertainty（或 clock jitter）；clock transition（p.160–161）。
- SDF 最广泛的应用是反标（back-annotation）（p.150–151）；SPEF 用于寄生参数记录、延迟计算与信号完整性计算（p.149–150）。
- 多周期路径概念与 set_multicycle_path 用法（RAM 12ns 需 2 周期的例子）、虚假路径分"功能性/主观性"两类（p.162–163）。
- WLM/SWLM 只能作早期时序估算，只有布线后 RC 提取才是真实的——支持网站"PNR 后移除 wire load model"（p.141–142、p.152）。

## 与书不一致（B 类，全部列出）
### B1. [严重度：高] interview/01-时序专题.md 题1
- 网站原话：`Setup Slack = T_period + (Capture Clock Arrival Time) - (Launch Clock Arrival Time) - ...`
- 书上原文（p.158，式6-14a）：`clk_launch_edge + clk_to_q + max_combo_delay =< clk_capture_edge - setup_R2`
- 差异与建议：书式中 clk_capture_edge 与 clk_launch_edge 之差已含整周期；再额外加 T_period 属重复计算，结果偏大一个周期（同文件下方"简化式"是对的，两式自相矛盾）。建议删除首式中的 T_period 项。

### B2. [严重度：高] basics/01-静态时序分析STA.md §10 Q1
- 网站原话："Setup 违例，Hold 也违例，先修哪个？答：先修 Hold。"
- 书上原文（p.165，6.4.2）："IPO 早期应用与发展中……先解决 setup 违例的问题，然后再处理 hold 违例……当今的 EDA……可以同时处理 setup 与 hold 违例的优化。"
- 差异与建议：顺序与书相反。建议改为"综合/早期 IPO 先修 setup；hold 留到时钟树真实后（Post-CTS/Post-Route）再修，现代 EDA 可同时优化"，既符合书也符合工程实践。

### B3. [严重度：高] basics/07-STA进阶篇.md §七 Q3
- 网站原话："hold：必须减小延迟，方法有限：插 buffer 抵消、down-size、用 HVT cell"
- 书上原文（p.156）："出现 hold 违例的解决办法要么增长数据路径的延迟，要么加快时钟到达 FF2。"
- 差异与建议：hold 修复须**增大**数据路径延迟；网站写成"减小"，且所列手段（插 buffer、降驱动、慢 cell）实为增延迟手段，前后矛盾。建议改为"必须增大数据路径延迟"。

### B4. [严重度：中] basics/07-STA进阶篇.md §6.2
- 网站原话："SPEF 三种精度：D (Detailed) / R (Reduced) / P (Partial)"
- 书上原文（p.149）："目前工程中使用的 SPF 有三种形式，分别是 DSPF、RSPF 和 SPEF"（DSPF=详细标准寄生参数格式、RSPF=简化标准寄生参数格式、SPEF=标准寄生参数交换格式）。
- 差异与建议：D/R/P 是三种不同的 SPF 文件格式，不是 SPEF 的精度等级；"P (Partial)"书上没有。建议改为"DSPF/RSPF/SPEF 三种格式，sign-off 常用 SPEF"。

### B5. [严重度：低] basics/01 §3.1、interview 题1 表
- 网站原话：`T_uncertainty | 时钟不确定性（jitter + margin）`
- 书上原文（p.161）："时钟不确定性 (clock uncertainty, 或时钟抖动 clock jitter)"
- 差异与建议：书上把 uncertainty 等同于 jitter；网站把额外 margin 也计入。建议注明"书上 uncertainty 即 jitter，margin 为工程附加项"。

## 统计
核对 27 条：A 12 / B 5 / C 10
C 类（书未涉及，仅统计，不判错）：OCV derate late/early 方向与 ±10% 细节、CPPR 计算细节、AOCV/POCV/SOCV/LVF、NLDM/CCS/ECSM、SI 阈值与修复、SF/FS corner 与 MMMC 组合、multicycle hold 配对 N-1、温度翻转/aging/Monte Carlo sign-off、Vt swap 修复方向、SSTA 细节展开（书有 6.3.4 节用 PDF/正态分布描述延迟，p.163–164，与网站 POCV 提法精神一致但网站未直接引用）。
另注：书 p.155 有 recovery（恢复）/removal（消除）定义，三篇文章均未提及，属覆盖缺口而非错误。
