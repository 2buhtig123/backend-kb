# 第 10 章 芯片设计的最终验证与签核 核对报告

核对对象：

- `site/src/content/docs/basics/08-MMMC详解.md`
- `site/src/content/docs/basics/09-ECO流程.md`
- `site/src/content/docs/basics/10-Signoff综合.md`

参考教材：《数字集成电路物理设计》第 10 章（p.220-234），扫描件 `book/p234.png` 至 `p248.png`。

## 统计

| 文章 | 核对条目 | A 一致 | B 已修正 | C 书未涉及 |
|---|---|---|---|---|
| 08-MMMC详解.md | 26 | 12 | 7 | 7 |
| 09-ECO流程.md | 25 | 10 | 7 | 8 |
| 10-Signoff综合.md | 28 | 11 | 7 | 10 |
| 合计 | 79 | 33 | 21 | 25 |

三篇均有实质重叠，frontmatter 已加 `verified: true`，`references` 已补第 10 章（p.220-234）；08 原有第 6 章条目保留。

## B 类逐条

| 位置（文章 + 小节） | 原文错在哪 | 书上依据（页码） |
|---|---|---|
| 08-MMMC §2.2 三大 Mode | 模式表只有 function / scan / shift 与 UPF 系列模式，缺书中的自检 BIST 与 DVFS | p.222 |
| 08-MMMC §2.3 必备 corner 数 | 用「Mode 数 × Corner 数」两轴相乘；书是三轴：模式 × 时序库端角 × RC 端角，实例 3×3×4=36 | p.224 |
| 08-MMMC §3.1 三个指数来源 | 写「ss / sf / fs → 4 个基本 PVT」；书按 worst / typical / best 三种 PVT 建库 | p.220 |
| 08-MMMC §3.1 寄生偏差 | 写「1×5 组合」；书列 cbest / cworst / rcbest / rcworst 四种 RC 端角 | p.224 |
| 08-MMMC §5.1 配置文件 | 用 `set_analysis_view -name` 定义视图，并把 SDC 文件路径塞进 `-constraint`；书用 `create_analysis_view` 定义，参数是约束模式与延时端角，`set_analysis_view` 只指定活跃视图 | p.223、p.227 |
| 08-MMMC §6.1 Innovus 模板 | `create_library_set` 的 `-timing/-si/-power` 写成 `{ [list ...] }`，多套一层大括号，传入的是字符串而非列表；书直接传 `[list ...]` | p.225 例 10-6 |
| 08-MMMC §7 Q1 | 把 C 定义为「工艺环境（PVT）」，漏掉 RC 端角；书的多端角含器件条件与 RC 条件两部分 | p.220、p.222 |
| 09-ECO §1.1 | 以 Timing / Power / Function 作为 ECO 的分类轴；书按发现问题所处时期分签核流片之前与之后两类 | p.232 |
| 09-ECO §1.2 | Metal-Only ECO「只改 M1/M2/M3」；书为只能对上层金属连线做有限修改，底层单元与 M1 不动 | p.232 |
| 09-ECO §3.1 | 断言功能修改必须重新综合 + 重新 PNR + 重新 Sign-off；书明确签核流片前可用递增式布局加入新逻辑，逐层改线 | p.232 |
| 09-ECO §3.2 | spare cell「RTL 设计阶段插入」；书要求物理实施开始时就随门级网表读入并随机布放 | p.232 |
| 09-ECO §8.2 | ECO 后检查清单只有 STA / DRC / LVS / IR / EM，缺逻辑等效验证 | p.231 |
| 09-ECO §9 Q2 | 「功能修改必然 logic 变动」；书：流片后只能靠预布 spare gate 接线，仍属 metal-only | p.232 |
| 09-ECO §9 Q6 | 「金属 ECO = M1/M2/M3 调」；书为上层金属连线，M1 与 stdcell 不动 | p.232 |
| 10-Signoff §1.1 | 把签核定义为 STA / IR / EM / PV / DFM 五大检查；书是时序验证、物理验证、逻辑功能验证三大任务 | p.220 |
| 10-Signoff §2.1 | Final Sign-off 交付物缺 DRC/LVS 规则文件、封装导线表、IP 合并用 SPICE 网表 | p.232 |
| 10-Signoff §3.2 | sign-off STA 脚本 `read_sdf`；书里 SDF 是布图后门级动态仿真的反标文件，STA 用 SPEF | p.220 |
| 10-Signoff §5 | 物理验证只列 DRC / LVS / ANT / PERC，缺 90nm 以下的光刻检查、可制造性检查与芯片集成/组装 | p.228-230 |
| 10-Signoff §8 Q2 | 称「4 corner × 2 mode = 8 个 view」是签核下限；书里多数设计只用 BC/WC 两个端角 | p.223 |
| 10-Signoff §8 Q7 | 交付清单列 GDSII / netlist / SDC / SPEF / SDF / Liberty；书只要求 GDSII、DRC/LVS 规则文件与结果文件 | p.232 |
| 10-Signoff 全文 | 未覆盖第三类签核任务（逻辑功能验证、形式验证、LVR），已补 §5.7 | p.231 |

## A 类补注（择要）

- 08-MMMC §1.2：补「视图 = 单个延迟端角 + 单个约束模式」，并说明端角含 PVT 库与 RC 条件（p.222）。
- 08-MMMC §2.3：补书中 36 种组合与按视图删减的做法（p.224）。
- 08-MMMC §4.1：补 setup / hold 的库与路径搭配规则（p.224）。
- 08-MMMC §6.3：新增书中 CTS 三视图实例（view1/view2 进 setup、view3 进 hold）（p.227 例 10-8）。
- 10-Signoff §3.4：补 SI 与时序合并分析、65nm 以下最坏条件偏悲观的处理（p.221）。
- 10-Signoff §5.3：补电路检查的两部分与 DC/AC 限度（p.229）。

## C 类清单（书未涉及，未改动）

08-MMMC：5nm 480 corner 案例；ss/ff/sf/fs/mc 与电压温度细分；各节点 mode×corner 经验表；corner 缩减 7 法、ECCN、POCV/AOCV、Slew derate、PG corner sharing；PT/Innovus 现代命令（`set_app_options`、LVF、pocvm）；18 corner 并行与三道关；Q4-Q6 跨时钟域与 LVF。

09-ECO：掩模单价与 MECO 术语；成本/周期表；setup/hold 修复策略与 ps 量级；useful skew 的 Tcl 实现；ecoCompiler；Power ECO / decap / Vt swap；spare 类型占比与密度、综合阶段部署；ICC2/Genus 命令；Q3-Q5、Q7、Q9、Q10。

10-Signoff：IR 3%/5%、EM 65%/70% 阈值；tape-out 时间轴；letter 模板与 sign-off database；NBTI/PBTI/HCI 与 aging 命令；Voltus/RedHawk 命令与修复案例；Calibre runset；Python 自动化 pipeline；AI 工具（Cerebrus/DSO.ai）；foundry 阈值与 waive；POCV/AOCV/LVF。

附注两处未改的书外问题：08-MMMC 把 125°C 标为「军工高温」，实际属工业/汽车结温范围；10-Signoff 表 1 写 EM 65% 而 §4.4 写 70%，文内自相矛盾。二者书均未涉及，按 C 类处理，建议后续单独统一。

## 值得注意的发现

**1. MMMC 的「corner」被普遍简化成 PVT，书里是三轴。**

书把端角拆成半导体器件条件（不同 PVT 的时序库）与 RC 条件（参数提取和降额）两部分（p.222），组合实例是 3 种模式 × 3 种时序库端角 × 4 种 RC 端角 = 36 种（p.224）。站内原文只按「mode × corner」两轴乘，等于把 RC 端角并进了 corner。另一处术语差异：书中通篇用「视图（view）」，没有用「scenario」；视图 = 单个延迟端角 + 单个约束模式（p.222 图 10-1）。日常说的「跑 30 个 scenario」，在书的语境里是「30 个视图」。

**2. ECO 的分类轴不是修复内容，而是发现问题的时点。**

网络流传的分法是功能 ECO、时序 ECO、功耗 ECO；书按逻辑等效验证发现问题的时期，只分签核流片之前与之后（p.232）。两类的可改动范围差别很大：签核前只要空间允许，可用递增式布局加入新逻辑，每一层连线都能改，还能增删 buffer 调驱动、手改错误连线；签核后只能对上层金属连线做有限修改，不能靠递增布局加逻辑，只能把预布的 spare gate（buffer、inverter、与门、或门、与非门、或非门）接起来。由此可知「metal-only 只改 M1/M2/M3」的说法是反的：书限定的恰恰是上层金属，M1 与单元不动。

**3. 形式验证与逻辑等效验证在书里是同一件事。**

书开宗明义：「形式验证也称为逻辑等效验证或逻辑等效检查」（p.231）。二者不是并列的两种检查，区别只在「形式验证」是方法名、「逻辑等效」是检查内容；与它们并列的是功能验证（functional verification）。书中还给了检查贯穿的全过程：RTL → 逻辑综合 → 逻辑优化 → 测试插入 → 布图规划 → 布局 → 时钟树综合 → 布线 → P&R 优化 → ECO 与芯片组装（p.231 图 10-8），比较对象可扩展到 RTL 对版图，即 LVR。

**4. SDF 在书里是仿真反标文件，不是 STA 输入。**

书把「用布图后产生的 SDF 做动态仿真验证」定义为反向标注（back-annotation）（p.220）；STA 走的是提取互连参数得到 SPEF 的路径（p.221）。不少教程把 `read_sdf` 写进 sign-off STA 脚本，属于概念混用。

**5. 签核只有三大任务，「五大检查」是工程口径。**

书明确签核含时序验证、物理验证与逻辑功能验证三项（p.220），末尾总结也按这三项收束（p.233）。IR/EM 在书里属功耗分析与电路检查的 DC 限度，光刻检查与 DFM 属物理验证，逻辑等效验证单列。站内按 STA/IR/EM/PV/DFM 分五项，容易把第三类任务整块漏掉。

**6. 芯片集成与组装是物理设计的最后一道工序。**

书把 logo、密封线（seal ring）、bonding 与封装导线表写进签核流程（p.230、p.232），并要求交付 GDSII、DRC/LVS 规则文件、DRC/LVS 结果文件三样；IP 合并时另加 SPICE 网表。现代 sign-off 清单通常只列报告，不含规则文件与导线表。

**7. 老工艺有明确的检查豁免。**

书给出可省略的边界：0.13µm 及以上可不做 MMMC；0.18µm 及以上、噪声不明显且主频不高时可不做 SI 检查；不关心功耗且对电源网格有把握时可不做功耗分析（p.233）。这与「sign-off 必须全项跑」的绝对说法不同，也说明 MMMC 的适用起点是 65nm 以下（p.222）。
