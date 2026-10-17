# 后端知识库 basics 模块技术正确性审查报告

审查范围：`site/src/content/docs/basics/` 下 15 篇文章。
判断依据：陈春章《数字集成电路物理设计》（科学出版社 2008）第 4/6/7/9 章，以及 Cadence Innovus / Synopsys ICC2 / PrimeTime / Calibre 的通行做法。
本报告只列技术硬伤（方向/符号、流程顺序、绝对化表述、数值量级），不涉及排版与文风。审查为只读，未修改任何文章文件。

---

### [严重度：高] 02-时钟树综合CTS.md：121 行附近
- **原文**：「### 4.1 预 CTS（Pre-CTS）…… **重点**：Hold 检查要 clean」
- **问题**：Pre-CTS 时钟是 ideal 的（skew 记 0），此时报出的 hold 违例在真实时钟树建好后会被重写；此时修 hold 只能给数据路径加延迟，直接吃掉 setup 余量。本文自己在 293-299 行和 04 篇 305 行都写的是「Post-CTS 修，Pre-CTS 不追求 clean」，121 行与之直接矛盾。
- **建议改为**：「Pre-CTS 重点做 Setup / DRV / Congestion；Hold 只处理远大于预期 skew 的少数大违例（或用 hold uncertainty 建模），主体留到 Post-CTS / Post-Route 用真实 skew 修。」

### [严重度：高] 02-时钟树综合CTS.md：61-64 行附近
- **原文**：「**Setup Slack 不够**？让 Launch 寄存器晚一拍、或者 Capture 寄存器早一拍」；「故意让 Capture 早一拍，把 Setup Slack 借给关键路径」
- **问题**：Setup slack = T + (T_capture − T_launch) − T_data − T_setup，要让 slack 变大必须让 Capture 时钟**延后**或 Launch 时钟**提前**。文中两个方向全反；且与同篇 299 行「让 Capture 时钟相对早到帮 Hold」自相矛盾。
- **建议改为**：「Setup 不够：让 Capture 晚到（或 Launch 早到）；Hold 不够：反过来（Capture 早到或 Launch 晚到）。借 slack 时是把上游路径的余量让给下游，靠的是移动中间那级寄存器的到达时间。」

### [严重度：高] 01-静态时序分析STA.md：275-276 行附近
- **原文**：「如果 Capture 时钟路径太短，导致时钟过早到达，可以人为**减慢 Capture 时钟**（skew 偏大帮助 Hold）」
- **问题**：Hold slack = (T_launch + T_data) − T_capture − T_hold，Capture 到得越晚 hold 越差。所以「Capture 太早」不会造成 hold 违例，「减慢 Capture」只会让 hold 更糟——正好写反。
- **建议改为**：「Hold 违例常见根因是 Capture 时钟相对 Launch 到得太晚（正 skew）或数据路径太快。修法：加快 Capture 时钟 / 推迟 Launch 时钟，或给数据路径插 delay cell；减慢 Capture 是修 Setup 的手段。」

### [严重度：高] 01-静态时序分析STA.md：77 行 / 116 行附近
- **原文**：「Setup Slack = T_cycle − (…) − T_uncertainty **− T_skew**」与「Hold Slack = (…) **− T_skew** − T_hold」
- **问题**：两式用了相反的 skew 定义。按业界主流定义 skew = T_capture − T_launch，正 skew 帮 setup、害 hold：setup 应是 **+ T_skew**，hold 是 − T_skew。现在 setup 写成了减号，等于告诉读者「skew 越大 setup 越差」，与 02 篇 useful skew 的结论冲突。
- **建议改为**：「Setup Slack = T + **T_skew** − (T_clk2Q+T_logic+T_net+T_setup) − T_uncertainty；Hold Slack = (T_clk2Q+T_logic+T_net) − **T_skew** − T_hold（skew = T_capture − T_launch，正 skew 帮 Setup、害 Hold）。」

### [严重度：高] 09-ECO流程.md：157-158 / 167-168 行附近
- **原文**：「- 让 T_capture_clk 提前 → setup slack +」；「# 2. 在 launch FF 的 clock path 加缓冲（让 launch 提前）」
- **问题**：两处都反。156 行给出的公式 T_slack = T_capture + T − T_launch − T_data 说明 capture 该**延后**；而在 launch 时钟路径上插 buffer 是让它**延后**而不是提前，launch 延后反而恶化 setup。
- **建议改为**：「- 让 T_capture_clk 延后（在 capture FF 的时钟路径加 buffer）→ setup slack +；或让 launch 时钟提前（减 buffer / 加大驱动）→ setup slack +。」

### [严重度：高] 09-ECO流程.md：82 行 / 98 行附近
- **原文**：「**Down-size 上游 buffer 改为 High-Vt** …… 省 5ps 延迟」（Setup 修复表）；「**用 LVT cell** | 降低路径上 cell 速度」（Hold 修复表）
- **问题**：两处方向都反。Setup 要更快 → up-size + 换低 Vt（LVT/ULVT）；Hold 要更慢 → down-size + 换高 Vt（HVT）。down-size/HVT 会增大延迟，LVT 会加快 cell，放在各自的表格里正好相反。04 篇 226 行「VTL → VTH → VTUL」也是同一个错（VTH 比 VTL 慢）。
- **建议改为**：「Setup：up-size 驱动、SVT/HVT → LVT/ULVT；Hold：down-size 驱动、LVT/SVT → HVT，或在数据路径插 buffer / 加长绕线。」

### [严重度：高] 06-低功耗设计UPF.md：336-340 行附近
- **原文**：「1. Power Switch 关断（断电） 2. Isolation 有效（保护接收域） 3. 电源稳定（电压为 0） 4. （Retention 保存状态）」
- **问题**：Isolation 必须在关断**之前**生效、Retention save 必须在断电**之前**完成，否则关断瞬间输出浮空会灌电流到接收域、状态也已随电源丢失。本文 175 行自己写着「ISO 必须在 Power Switch 关闭之前有效」，Q1 与之矛盾。
- **建议改为**：「1. Retention save → 2. Isolation 生效 → 3. Power Switch 关断 → 4. 等待电源泄放；上电反向：开 switch → 等电源稳定 → Retention restore → 释放 isolation。」

---

### [严重度：中] 01-静态时序分析STA.md：149-151 行附近
- **原文**：「保守的 OCV Derate：数据路径：+5%（更慢，更悲观）；时钟路径：-5%（更快，更悲观）」
- **问题**：Setup 检查要 launch 时钟**放慢**（+late）、capture 时钟**加快**（−early），data 放慢；Hold 检查三者全部反过来。把「时钟路径」一律 −5% 会让 launch 时钟变快，对 setup 是乐观方向，等于少算了悲观量。
- **建议改为**：「Setup：launch clock / data 用 late derate（+），capture clock 用 early（−）；Hold 全部反向。同一条时钟公共段上的差异由 CPPR 扣回。」

### [严重度：中] 01-静态时序分析STA.md：160 行附近
- **原文**：「Setup Slack（含 OCV 悲观） **− CPPR** = 真实 Setup Slack」
- **问题**：CPPR 是「去掉多余悲观」，把重复计算的那部分延迟**加回** slack，slack 应变大。写成减号会让读者以为 CPPR 让时序更紧。
- **建议改为**：「Setup Slack（含 OCV 悲观量）**+ CPPR = ** 更接近真实的 Setup Slack。」

### [严重度：中] 04-布局布线PNR.md：226 行附近
- **原文**：「换 fast cell（VTL → VTH → VTUL）」
- **问题**：阈值电压高低与速度的关系是 HVT 最慢、SVT 中、LVT 快、ULVT 最快。序列里把 VTH 排在 VTL 之后当「更快」，方向反了（VTH 更慢）。
- **建议改为**：「换 fast cell：HVT → SVT → LVT → ULVT（速度递增、漏电递增）；漏电优先时反向换。」

### [严重度：中] 07-STA进阶篇.md：118 行附近
- **原文**：「| `positive_unate` | 输出随输入**同方向**变化 | 反相器、缓冲器、与门 |」
- **问题**：反相器是 negative_unate（输入升、输出降），放在 positive_unate 的例子里是硬错；同表 119 行把反相器/与非门列在 negative_unate 又是对的，两处自相矛盾。
- **建议改为**：「positive_unate：缓冲器、与门、或门；negative_unate：反相器、与非门、或非门；non_unate：异或。」

### [严重度：中] 07-STA进阶篇.md：288 行附近
- **原文**：「AOCV 把"路径越长、偏差越大"的物理事实**显式**建模。1.0 V，5 级 buffer，每级偏差 2%，5 级累加成 ~10%」
- **问题**：AOCV 的核心恰恰相反——随机偏差按 √N 收敛，路径越深**每级** derate 越小（表随 depth 递减）。按级数线性累加成 10% 是 flat OCV 的悲观做法，不是 AOCV。
- **建议改为**：「AOCV：路径越深，单级 derate 越小（随机偏差部分抵消，总偏差约按 √N 增长）；同时按物理距离分级，近距离路径 derate 更小。」

### [严重度：中] 07-STA进阶篇.md：345 行附近
- **原文**：「**SI Hold** | victim 0→1 跳变，aggressor 同时 0→1 跳变，**加重 transition** | …… Hold slack **负向**」
- **问题**：耦合电容两端同向翻转时 victim 被**加速**、延迟变小，这才是 hold 变差的机理；反向翻转才减慢 victim、恶化 setup（同表 346 行写对了）。「同向 → 加重 transition」把机理写反了。
- **建议改为**：「SI-Hold：aggressor 与 victim 同向翻转 → victim 加快 → hold 变差；SI-Setup：反向翻转 → victim 变慢 → setup 变差。」

### [严重度：中] 07-STA进阶篇.md：528-534 行附近
- **原文**：「CRPR = 时钟和数据路径上**共享 buffer/cell 的共通偏差**」；示例中 clock path 与 data path 共享 buf1
- **问题**：CPPR/CRPR 只作用于 launch 与 capture **两条时钟路径**的公共段（Clock Reconvergence Pessimism Removal），数据路径不参与。示例把 buf1 画成时钟与数据路径的共享点，是错误模型。
- **建议改为**：「CRPR = launch 时钟路径与 capture 时钟路径的公共段上，因 late/early 双算而多扣的悲观量；公共段越长，可扣回的越多。」

### [严重度：中] 08-MMMC详解.md：89 行附近
- **原文**：「| **shift** | capture-only（不用 ATPG）| 只算 capture 路径 |」
- **问题**：scan 的两种模式正好反了：shift 是扫描链移位（慢时钟，主要看 shift 路径的 hold），capture 是 at-speed 捕获（功能时钟，看 capture 路径的 setup）。写成「shift = capture-only」会让整个 mode 划分不可信。
- **建议改为**：「shift：慢时钟下把 pattern 移入/移出，主要约束 shift 路径的 hold；capture：at-speed 捕获，主要约束功能路径的 setup。」

### [严重度：中] 10-Signoff综合.md：217-218 行附近
- **原文**：「5 年老化降低 Vth 5~10% …… 影响：cell 变慢，hold slack 减少」
- **问题**：两个方向都错。NBTI 使 |Vth| **升高**（不是降低），cell 变慢；而数据路径变慢首先恶化的是 setup，对 hold 反而是变宽松（真正要担心的是时钟/数据路径老化程度不一致）。Q9「老化后 hold slack 显著下降」同错。
- **建议改为**：「NBTI/HCI 使 |Vth| 增大、cell delay 增大，老化主要吃掉 setup 余量；hold 需关注的是时钟路径与数据路径老化速率不一致引入的偏差。」

---

### [严重度：低] 01-静态时序分析STA.md：54 行附近
- **原文**：「| **In-to-Out** | Input Port | Output Port | Setup only（异步路径） |」
- **问题**：纯组合的 feedthrough 路径用 set_input_delay + set_output_delay 约束后，max（setup）和 min（hold）都要检查，不是只查 setup。
- **建议改为**：「In-to-Out：纯组合路径，用 set_max_delay / set_min_delay（或 input+output delay）约束，max 与 min 都要查。」

### [严重度：低] 07-STA进阶篇.md：110 行附近
- **原文**：「7nm 以下，wire RC 主导，NLDM 会比真实延迟**误差 ±30ps**——超过一个时钟周期」
- **问题**：量级错。同篇主时钟是 1 GHz（周期 1000 ps，161 行），30 ps 只是一周的 3%；先进工艺周期也在 300 ps 以上，±30 ps 不可能「超过一个时钟周期」。NLDM 的误差问题在于波形与 RC 分布建模失真，不在于这个量级。
- **建议改为**：「NLDM 在先进节点对长互连、高阻网络的延迟误差可达数 ps~数十 ps（相对误差数十个百分点），且无法表达噪声与 glitch，故 7nm 以下改用 CCS/ECSM。」

### [严重度：低] 11-DFT进阶篇.md：131 行附近
- **原文**：「### 3.1 Tessent（Cadence / Mentor）」
- **问题**：厂商归属错。Tessent 是 Siemens EDA（原 Mentor Graphics）产品，与 Cadence 无关；01 篇 295 行写的是「Tessent | Siemens EDA」，两篇互相打架。
- **建议改为**：「### 3.1 Tessent（Siemens EDA，原 Mentor Graphics）」。

### [严重度：低] 05-物理验证PV.md：70-71 行附近
- **原文**：「- **StarRC**（Synopsys）」列在 DRC 工具清单里；「- **IC Validator**（Siemens EDA）」
- **问题**：StarRC 是寄生参数提取工具（不是 DRC）；IC Validator（ICV）是 Synopsys 的产品，不是 Siemens。14 篇 33 行写对了 IC Validator = Synopsys，两篇矛盾。
- **建议改为**：「DRC：Calibre（Siemens）、Pegasus/PVS（Cadence）、IC Validator（Synopsys）；寄生提取：StarRC（Synopsys）、QRC（Cadence）。」

### [严重度：低] 02-时钟树综合CTS.md：311-316 行附近
- **原文**：「| **CCOpt** | Synopsys | ICC2 内置，与综合无缝衔接 |」
- **问题**：厂商与定位都错。CCOpt / CCOpt-CTS 是 Cadence（Innovus / Encounter）的时钟树与并发优化引擎，ICC2 用的是 clock_opt / CCD。04 篇 141 行「CCOpt（ICC2）」同样错。
- **建议改为**：「CCOpt-CTS（Cadence，Innovus 内置）；ICC2：clock_opt / Concurrent Clock and Data（CCD）。」

---

## 统计

- **共发现 21 条**：高 7 / 中 9 / 低 5。
- 未发现硬伤的篇目：13-功耗分析实操、14-PV常见违例详解（这两篇近期修订过，质量明显好于其余）；15-SRAM与Macro集成 仅 188 行 `set_ccopt_property -pin sram_inst/CLK -sink_type auto` 一处细节（要让 SRAM 时钟脚成为叶子 sink 应设 `-sink_type stop`），未单列。
- 未发现「绝对化表述」类需要单独修的条目——这类问题基本已被上面 7 条方向性错误覆盖（Pre-CTS 必须 hold clean 是最典型的一条）。

### 最需要马上修的 3 条

1. **02-时钟树综合CTS.md：121 行「Pre-CTS 重点：Hold 检查要 clean」**——正是被人公开纠错的那类错误，而且与本文 293-299 行直接自相矛盾，改起来只需一行，收益最大。
2. **skew 方向三连错：02 篇 61-64 行、09 篇 157-158/167-168 行、01 篇 275-276 行**——useful skew 是面试必问题，三处错的方向一致（都把「capture 延后帮 setup」写反），建议按同一口径一次性改齐，并把 01 篇 77/116 行的 skew 符号定义补上。
3. **09-ECO流程.md 82/98 行与 06-低功耗设计UPF.md 336-340 行**——前者把 setup/hold 修复的 Vt 与 size 方向全写反（04 篇 226 行同源），后者把掉电顺序写反且与同篇 175 行矛盾；这两处都是「照着做就会把设计做坏」的级别。
