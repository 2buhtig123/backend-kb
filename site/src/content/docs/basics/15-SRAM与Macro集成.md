---
title: "SRAM / Macro 集成：Floorplan 阶段的硬核决策"
description: "Memory 与硬核 IP 在 Floorplan 阶段的摆放原则、halo 与 routing blockage 设置、出 pin 层与通道设计、电源与时钟处理，以及 Innovus 中的实操命令与检查清单。"
module: basics
order: 14
---

# SRAM / Macro 集成：Floorplan 阶段的硬核决策

04 篇讲了 PNR 的整体流程，本篇聚焦其中一个分支：**大块面的 SRAM 和硬核 IP 怎么集成到 die 里**。

这是整个物理设计里"决策成本最高、返工代价最大"的一步。floorplan 一旦定了 macro 的位置，后面 CTS、绕线、PV 都是在既定格局下做局部优化。一个糟糕的 macro 摆放可以让上层金属绕不通、IR Drop 超标、时钟树做不平，而这些在 `place_opt` 阶段是救不回来的。

---

## 一、集成的第一步：搞清你手里到底有哪些文件

一个完整的 SRAM / 硬 IP 交付通常包含这些：**少一个都可能让后面的流程崩掉**。

| 类型 | 常见文件名 | 用途 | 缺了会怎样 |
| --- | --- | --- | --- |
| LEF | `sram128x32.lef` | FRAM view：物理尺寸、pin 位置与金属层、blockage 层 | 工具看不到尺寸和 pin，无法摆放与绕线 |
| Liberty | `sram128x32_ff.lib` / `.db` | 时序模型：setup/hold/min pulse width/recovery-removal | STA 报错，"no timing model for cell" |
| GDS / OASIS | `sram128x32.gds` | 实际版图，PV 合并与 LVS 用 | 无法 stream out，LVS 报 black box |
| 物理库 | `.ndm` / `.clf` / Milkyway | 工具专用的二进制 view | 视工具而定，可能挡住某些优化 |
| 网表 | `sram128x32.v`（行为级） | 功能仿真与形式验证 | LVS 无法比对，形式验证 fail |
| 应用文档 | datasheet / integration guide | **最重要的实际信息源**：供电要求、decap 要求、出 pin 层建议、halo 要求 | — |

> **被低估的是最后一项**。卖家-provided integration guide 里通常会给出 halo 具体数值、禁止走线的层、推荐的 decap 数量。这些信息是不体现在任何机器可读文件里的，也不在 LEF 里。拿到一个新 IP 先通读这份文档，能省掉后面一周的 DRC/LVS 反复。

---

## 二、Macro 的种类与设计特征

不同种类的 macro 有不同的脾气，处理策略差别很大：

| 类型 | 特征 | Floorplan 关注点 |
| --- | --- | --- |
| Single-Port SRAM | 最常见。一个时钟周期内一次读或写 | 出 pin 集中在一侧，注意位线方向 |
| Dual-Port / Two-Port SRAM | 可同时读写 / 双读 | pin 数量多，对 channel 资源要求高 |
| Register File | 多端口，通常较小 | 常当多个小 macro 处理，注意互相间距 |
| ROM（掩模型） | 内容由掩模或通孔层决定 | 只有读端口，没有写控制电路；复位后无需初始化等待 |
| CAM / TCAM | 内容寻址，比较逻辑复杂 | pin 密度极高，对上层金属压力大 |
| eFuse / OTP | 一次性编程 | 需要特定的 programming pin 并且周边不可有其他 metal |
| Analog Macro（PLL / LDO / ADC / PCIE+DDR PHY） | 电源、匹配、隔离要求苛刻 | 需要 deep NWELL / guard ring / 特定 LVS clean 区域 |
| Hard Digital IP（CPU core / DSP / NOIC PHY） | 自带 power grid 和 routing | 通常需要一点 AP ring 或是 instance-specific 处理 |

**核心判断：这个 macro 是自己带全资源，还是依赖外部环境供给。** 模拟 IP 多数自带内部的电源网格与去耦电容，但对上方的走线层有严格限制；而 SRAM 通常依赖外部提供稳定的电源网络，需要设计者自己把宽电源条铺到它的供电脚上。

---

## 三、摆放原则：先给六条经验法则

### 3.1 靠边不靠心，让中间保持连续

经典原则是：**把 macro 沿着 die 四周摆放，中间给 standard cell 留一大片连续区域**。原因是：

- 中间的 std cell 区域必须是**完整连续的**，否则 placeCongestion 工具放不下单元，利用率上不去
- 堆电源线更容易：外围可以放环绕的 power ring
- 散热： memory 通常是热点，靠边更容易通过 packaging 散热

反模式：把一颗大 SRAM 摆在正中间，把它周围一圈的区域割裂成四条孤立的岛，routing 永远堵。

### 3.2 按数据流靠近

macro 与它的主要访问逻辑之间距离要短。实践做法：

```
CPU Core ──→ L1 ICache SRAM ──→ L1 DCache SRAM ──→ L2 Cache SRAM ──→ DDR PHY
   └── 每两级之间的距离是该设计 performance budget 的关键
```

判断谁和谁应该挨着，最快的办法是看模块之间的连线密度，Innovus 的 flight-line（飞线）视图可以直接把它可视化：

```tcl
# 画出模块间的连线密度
setDrawView place
# 在 GUI 中打开 flight lines 显示即可看到模块间的连接密度
```

### 3.3 保留 channel

相邻 macro 之间必须留出 **通道（channel）**，给从中间穿过的总线和 power strap 留位置。

典型规则：两个 macro 之间留 **10 ~ 15 μm**（对应几十到上百个 routing track，视工艺层而定）。channel 太窄会导致上层金属绕不通，产生绕北路上元器件后无法修的 congestion。

### 3.4 留出 halo / keep-out margin

**halo（或称 keep-out margin）** 是 macro 四周不能放 standard cell 的一圈空白。

```tcl
# Innovus：给指定 macro 加 halo
addHaloToBlock 10 10 10 10  -allMacro      ;# 四周各 10μm
addHaloToBlock 15 15 15 15  SRAM_DP_0      ;# 针对某个 instance

# routing halo：halo 的一圈范围内不允许信号线穿 macro 区域
# 一般直接用 addHaloToBlock 一并处理即可
```

halo 的三个作用：

1. **避免电源轨冲突**：SRAM 的电源脚需要连到外部电源条，如果四周紧贴标准单元，最外侧单元的电源轨可能与 memory 的电源几何冲突，产生短路或 DRC |
2. **给 pin access 留位置**：pin 出来的线要拐出来，没空间就绕不出来
3. **满足阱 / tap 规则**：周边要能放下 endcap / tap cell

### 3.5 专门的 routing blockage

大多数 SRAM 规定：**macro 上方只允许走指定的高层金属**（通常是最上面两层用于 power netted），中间层严格禁止。原因有两个：耦合到存储单元的位线上会造成读取失效；也阻挡了 memory 自身的 design flow-established routing。

```tcl
# 创建覆盖 macro 上方 M1~M4 的 routing blockage
createRouteBlk -box {x1 y1 x2 y2} -layer {M1 M2 M3 M4} -name over_sram_blk
createRouteBlk -cover -inst SRAM_INST -layer {M1 M2 M3 M4} -pgnetonly false

# 注意：SRAM 的 LEF 里通常自带 OBS 层，工具会自动建立 blockage，不必重复手工加
```

### 3.6 Flyline-driven automatic placement

现代工具支持 macro 自动摆放（Innovus 的 `planDesign` 与 concurrent macro placement），但**不要完全依赖**。正确用法是：

```tcl
# 自动给个初版
planDesign
# 再做 Blackbox refinement 手工调整
placeDesign -concurrent_macros
refineMacroPlacement -maxIteration 10
```

自动摆放擅长处理"几十个小 memory 的宏观分布"，不擅长处理"电源规划、特殊 IP 的隔离要求"。所以工程上的做法是：**automatic pass 打底 + 手动调整关键 macro 的形态、方向、channel**。

---

## 四、出 pin 层与工艺方向的细节

### 4.1 Memory 的出 pin 在哪一层

大多数 SRAM 的 pin 在 **Metal2 或 Metal3**，而且集中在一侧或两侧（取决于是否 compile-wide）。这意味着：

- **M1 在 macro 区域基本是被 OBS（obstruction）层封掉的**，不能用于走线。M1 通常是标准单元的电源轨层，与 macro 区域的金属重叠会引发 DRC
- 如果一整排 SRAM 都以同一个方向排列，它们的 pin 会以规律的方式排列——这种规律性实际上是工具的 blowing-blow utilization 更容易
- 相邻 SRAM 之间如果因为 orientation 导致 pin 相对，它们之间的连线最直接；反之如果 pin 背向，绕线要绕整个 macro 一圈

### 4.2 Orientation 的选择

Memory 的 orientation 不只是旋转，还涉及 **word line / bit line 的方向**：某些 SRAM 编译器对位线朝向有要求，朝向不同会影响访问速度与动态功耗，需要按集成手册确认。

实践标准：

1. **优先保证 power rail 方向一致**：所有 SRAM 的 power pin 应该跟着 design 的 power rail 的方向
2. **缩短关键路径**：出 pin 侧朝向访问它的 logic
3. **整体一致**：同类型的 memory 尽量同向，pin 出线规整，绕线资源均匀

---

## 五、电源：SRAM 是 IR Drop 重灾区

SRAM 工作时位线和大列同时翻转，瞬时电流很大。工程上常见的翻车方式是：STA clean、LVS clean，回片之后却发现 memory 在高负载工况下出现读写错误。

### 5.1 三个必须做的事

1. **专用的电源条**：不要指望标准单元的电源轨去给 SRAM 供电。应该在 SRAM 所在区域上方专门布宽电源条，并用成排通孔打下去
2. **充足的去耦电容**：供应商文档通常会明确写出每颗 SRAM 旁边需要配多少 decap。不要凭感觉省，去耦不足直接表现为读写裕度下降
3. **给 sink 足够的 via**：电源条到 SRAM power pin 之间要打足够多的通孔，那是 IR 的主要贡献

```tcl
# 查看 memory 周边的 IR 热点
# Voltus / RedHawk 里：加载 latest Innovus database
# 重点 marking: instance named *SRAM* 的 VDD drop histogram
```

### 5.2 电源 grid vs SRAM 摆放的冲突

如果 SRAM 上方的上层金属被电源条占满，出 pin 引线就没有可用资源了。这也是「先铺电源还是先摆 macro」这个经典问题的答案：**先摆 macro**——因为 macro 的尺寸是死的，电源条的位置是可调的；反过来做会非常痛苦。

---

## 六、时钟：Memory 的 clock tree 处理

Memory 集成时钟上有几个特殊点：

1. **SRAM 的 timing model 已包含内部时钟树延时**。工具会从 SRAM 的 clock pin 往里走过 Memory 内部的 clk tree。所以 Clock uncertainty constraint (the -\`clock_tree\)) 不包含 memory 内部的部分
2. **Clock tree 的 sink 是 SRAM clock pin**。CTS 要考虑 SRAM 的位置延迟
3. **必须显式把 SRAM 内部的时钟节点排除在 balance sink 之外**。如果不做处理，工具会认为要平衡到 SRAM 内部成千上万个触发器，生成的时钟树会异常庞大，skew 反而更差

```tcl
# 把 SRAM 的时钟脚设为叶子节点，工具不再往其内部平衡
set_ccopt_property -pin sram_inst/CLK -sink_type auto
# 若 SRAM 被展开出现内部节点，则显式排除
set_ccopt_property -pin sram_inst/CLK -through_type exclude
```

另外一个实践点：**单独一层专门给 memory clock 做 H-Tree 或者使用 dedicated clock mesh**，避免 memory clock 受 standard cell logic 的拖累。

---

## 七、检查清单：集成后必跑的项

```tcl
# 1. 物理完整性：tile 是否有 overlap / 有 spacing 违例
checkFPlan -report checkfplan.rpt

# 2. 电源短接 / 电源连断开
verifyConnectivity -type special -error 1000 -report pg.rpt

# 3. pin access 是否可达：所有 macro pin 是否能访问到
checkPlace

# 4. max fanout/max cap 检查
timeDesign -preCTS
```

同时推荐去看这几类报告：

| 报告 | 关注点 |
| --- | --- |
| `checkFPlan` | macro 是否越过边界、是否违反 spacing、halo 是否相互冲突 |
| congestion map | macro 之间的 channel 是否拥挤 |
| `verifyConnectivity` | SRAM 的电源脚是否真正连到了电源网络上。这一项往往是回片失败的高频根因 |
| post-place timing | access path 到 memory 的 setup 是否因为距离过远而违例 |
| IR map | SRAM 周边是否有 drop hotspot |

---

## 八、面试五问

**Q1：为什么 floorplan 阶段要优先考虑 macro 摆放？**

答：因为一旦摆放定了，后面所有步骤都是在这个格局下优化。摆放糟糕会导致三个很难救的问题：standard cell 区域被切割成孤岛导致利用率上不去、通道过窄导致绕线拥塞无法在布线阶段解决、电源条被 macro 挡住导致 IR Drop 超标。这三个都是 floorplan 决策的直接后果。

**Q2：什么是 halo？为什么必须加？**

答：halo 是 macro 四周不允许摆放 standard cell 的留白区域。三个作用：避免最外侧单元的电源轨与 memory 的电源几何冲突产生 DRC、给 memory 出 pin 的引线留出空间、以及保证周边能放下 tap / endcap 单元满足阱接触规则。

**Q3：SRAM 为什么容易出现 IR Drop 问题？怎么处理？**

答：SRAM 工作时位线和灵敏放大器会同时大量翻转，瞬时电流很大。处理办法：给 SRAM 配专用的宽电源条而不是依赖标准单元的电源轨、按 vendor 要求在旁边放置充足的去耦电容、以及在电源条到 SRAM 电源脚之间打足够多的通孔（通孔串联电阻往往是 IR 的主要来源）。

**Q4：CTS 阶段 SRAM 的 clock pin 为什么要特殊处理？**

答：因为 SRAM 的时序模型已经包含了内部时钟树延时，工具只需把时钟送到 SRAM 的时钟脚即可。如果不把内部成千上万个 sink 排除，工具会试图去平衡那些节点，导致时钟树结构异常庞大、skew 恶化。通常用 CCOpt 的属性设置把它当作叶子处理。

**Q5：拿到一个新的 SRAM / IP，哪些文件是必须的？最容易被忽略的是什么？**

答：LEF（物理尺寸与 pin）、liberty（时序模型）、GDS（版图）、行为级 Verilog（LVS 与形式验证用）。最容易被忽略的是 vendor 提供的 **integration guide**（集成手册），halo 数值、禁走线层、decap 要求、特殊的隔离需求都只在那份文档里，LEF 里是没有的。

---

## 小结

Macro 集成是 floorplan 阶段返工代价最高的一环，也是最能体现工程师经验差距的地方。三条原则概括起来：

1. **先摆 macro，再规划电源网格**：macro 的尺寸是死的，电源条是可调的
2. **给通道和 halo 留够余量**：省下来的那一两微米，会在布线阶段花十倍时间还回来
3. **通读 vendor 的集成手册**：那些 halo 数值和禁止布线层，机器可读文件里真的没有

至此本系列的后端主干知识已经铺完：STA、CTS、PNR、UPF、MMMC、ECO、Sign-off、DFT、Tcl、功耗分析、PV 违例、Macro 集成，形成了一个相对完整的闭环。后续可以补充的是 CDC 跨时钟域、形式验证以及先进工艺下 UPF 与可靠性的交叉话题。
