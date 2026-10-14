---
title: "ECO（Engineering Change Order）：流程与实施方法"
description: "功能 ECO 与 Metal-Only ECO 的实施流程、spare cell 使用、网表与物理 ECO 的差异。"
module: basics
order: 8
---

# ECO（Engineering Change Order）：流程与实施方法

> "我的设计 sign-off 后漏测一个 bug，但流片已不可能改功能了"——这是工程事故。  
> ECO 就是**补救措施**：用尽量小的改动，让流片出来的芯片变得可用。  
>
> 本章是基础篇的"做工程必备"的加深。  
> **目标**：读完能独立完成 Timing/Power/Function 三类 ECO，能写完整 ECO 闭环脚本。  
>
> **前置知识**：STA 基础、PNR 流程、MMMC。  
> **适合**：已拿到 tape-out 任务、需要做 ECO 的工程师。

---

## 目录

- [一、ECO 的三种类型与基本原理](#一eco-的三种类型与基本原理)
- [二、Timing ECO：setup/hold/holdup 修复](#二timing-eco补充holdup-修复)
- [三、Function ECO：功能修复与替代](#三function-eco功能修复与替代)
- [四、Power ECO：功耗修复与降低](#四power-eco功耗修复与降低)
- [五、Spare Cell Plan：ECO 的"预留单元格"](#五spare-cell-planeco-的"预留单元格")
- [六、ECO 闭环流程：从发现违例到修复完成](#六eco-闭环流程从发现违例到修复完成)
- [七、Innovus / ICC2 / Genus 的 ECO 自动化](#七innovus--icc2--genus-的-eco-自动化)
- [八、ECO 闭环检查清单](#八eco-闭环检查清单)
- [九、ECO 八股常考题目](#九eco-八股常考题目)

---

## 一、ECO 的三种类型与基本原理

### 1.1 ECO 三大类型

| ECO 类型 | 触发原因 | 修复方法 | 工程量 |
|---|---|---|---|
| **Timing ECO** | STA setup/hold 违例 | 插 buffer、增驱动、改线、VT 替换 | 中 |
| **Power ECO** | IR Drop / EM / 功耗超标 | 加宽 metal、加 decap、改 cell | 中 |
| **Function ECO** | RTL 改 bug，改连接 | 替换 cell、改 net 连线 | 大 |

### 1.2 ECO 的两大层次

```
金属层 ECO (Metal-Only ECO, MECO)：
- 不改 stdcell，只改 M1/M2/M3 金属层
- 修改成本最低 ~ $5k-10k 一层金属 mask
- 用于 timing/power 修复

逻辑 ECO (Logic ECO)：
- 改 stdcell、Spares 替换、增 buffer
- 修改成本高 ~ $50k-100k+ 一层 mask 重做
- 用于功能修复
```

### 1.3 ECO vs Spin vs Re-spin

| 修复手段 | 修改成本 | 时间 |
|---|---|---|
| Metal-Only ECO | ~1 周 | 1 周 |
| Logic ECO + Metal | ~$100k / 2-3 周 |  |
| Mask Re-spin | ~$1M / 1-2 月 |  |
| Re-fab（Spin）| ~$3M / 2-4 月 |  |

**经验**：**90% 的 timing/power 修复用 Metal-Only ECO 即可**，但功能修复往往要重做 mask。

---

## 二、Timing ECO：setup/hold 修复

### 2.1 Setup 违例修复（最常见）

**Setup 违例本质**：数据路径延迟 > 时钟周期。修复 = **减小数据延迟** 或 **增加时钟延迟**。

**6 种修复策略**（按偏好排序）：

| # | 策略 | 操作 | 优点 |
|---|---|---|---|
| 1 | **Down-size 上游 buffer 改为 High-Vt** | 把 SVT → HVT → LVT cell 提升 | 省 5ps 延迟 |
| 2 | **Differ device area** | 把 NAND 改 INV，加大驱动 | 减少延迟 8ps |
| 3 | **插 buffer 到 path** | data path 添加 BUF | 减少 net delay |
| 4 | **Move cell** | 重新 P&R 调整 net 长度 | 直接减少路径 |
| 5 | **Clock skew 调优** | 用 useful skew 把路径变慢 | 0 物理改动 |
| 6 | **Logic restructure** | 改变 netlist，插入 buffer | 不破坏 logic 情况下重新布局 |

### 2.2 Hold 违例修复

**Hold 违例本质**：数据路径延迟 < 时序器件 hold 时间。

**5 种策略**：

| # | 策略 | 操作 | 效果 |
|---|---|---|---|
| 1 | **插 Delay Buffer** (BUF) | 在数据路径加 buffer | 增加 50ps delay |
| 2 | **用 LVT cell** | 降低路径上 cell 速度 | 减小延 5ps |
| 3 | **加 net 长度** | 重新路由加长 wire | 增大延迟 |
| 4 | **size down 上游 driver** | 把 INV X2 改 INV X1 | 减缓 transition |
| 5 | **插 level shifter** | 不一定合适，看 domain | 看情况 |

### 2.3 ECO TCL：Setup 修复自动化（示例）

```tcl
# ====================================
# Timing ECO Automation: Setup Fix
# ====================================

# 1. 报告违例
set all_violations [report_timing -delay max -path full -max_paths 1000 -sort_by group]

# 2. 解析违例，提取 path endpoint
set endpoints_list {}
foreach_in_collection violation $all_violations {
  set end [get_object_name [get_attribute $violation endpoint]]
  lappend endpoints_list $end
}

# 3. 使用 ECO Spare Cells
set spare_cells [get_spare_cells all_spare_cells]
if {[sizeof_collection $spare_cells] < [llength $endpoints_list]} {
  puts "warning: not enough spare cells, supply shortage"
}

# 4. 试图插入 BUF1 到 path
set fixed_count 0
foreach ep $endpoints_list {
  set ep_pin [get_pins $ep]
  set buf_cell [lindex $spare_cells $fixed_count]
  # 简化处理：实际需要做 ecoPlace
  echo "Inserting BUF on $ep at $buf_cell..."
  ecoPlace -check_legality false [get_cell $buf_cell] [get_pins $ep]
  incr fixed_count
}

# 5. 重新时序
update_timing -full

# 6. 验证 fix
if {[report_timing -delay max -path full -max_paths 100] == 0} {
  puts "All setup violations fixed"
} else {
  puts "Still have violations, manual fix needed"
}
```

### 2.4 useful skew：0 物理改动的 ECO

**Useful Skew 是 ECO 工程师的"魔法棒"**：

```
普通 STA：
T_setup_slack = T_capture_clk + T_period - T_launch_clk - T_data

useful skew 修复：
- 让 T_capture_clk 提前 → setup slack +
- 调整 launch FF 的 buffer cell → launch_clock 提前
```

**TCL 实现**：
```tcl
# 1. 找到 setup 违例的 launch/capture DFF
set launch_ff [find_launch_dff_of_violation $vio]
set capture_ff [find_capture_dff_of_violation $vio]

# 2. 在 launch FF 的 clock path 加缓冲（让 launch 提前）
set clock_buffer [get_free_buf_near $launch_ff]
place_cell $clock_buffer -near $launch_ff

# 3. 重新 STA 验证
update_timing
report_timing
```

---

## 三、Function ECO：功能修复与替代

### 3.1 Function ECO 的"两难困境"

**真实案例**：
- SoC 即将流片，验证组发现某个 edge case 逻辑错误
- RTL 修复只有几行——但 RTL 修改 = 重新综合 + 重新 PNR + 重新 Sign-off = **至少 2 周 + $200k**
- Metal-Only ECO 可行吗？**不一定**——功能改了，stdcell 改了，绕线全变了

**实际工程两类策略**：
1. **Spare Cell 提前部署**：从 RTL 阶段就规划好可重构的 cell（详见下一节）
2. **Function ECO 直接走 Logic**：但只改最关键 cell，最小化金属变化

### 3.2 Function ECO vs Spare Cell 重建

**Spare Cell 路线**：
- 提前：RTL 设计阶段插入 `SYMBOLIC` spare cell
- 修复时：把 spare cell 改成你要的 cell，连接对应 net
- 优点：完全 metal-only，0 mask 重做
- 缺点：只解决"已经规划好"的 bug

**Logic ECO 路线**：
- 临时：ecoCompile 把功能修改映射成 stdcell 差异
- 缺点：可能有 M0/M1/M2/M3 重布线 → mask 改动

### 3.3 ecoCompiler 工具详解（Cadence）

```tcl
# EcoCompiler 在 Cadence Innovus 中的使用
set_app_options -name opt.flow.eco_incremental_mode -value true
set_app_options -name eco.flow.ecoUpdateFill -value true
set_app_options -name eco.flow.ecoPlaceAndRoute -value true

# 1. 提取原始 netlist
saveNetlist original.v

# 2. 修改 netlist（功能修复）
# 用户修改 vs/rtl 后的 netlist → newfunc.v
# 工具会自动产生 eco.v 文件

# 3. 应用 ECO
ecoCompile -lef my_tech.lef -lib my_tech.lib -netlist original.v -modified_netlist newfunc.v

# 4. ECO 报告
report_eco -summary
```

### 3.4 Logic ECO vs Spare Cell 选择决策

```
实际情况 → 选择：
├── bug 在 RTL，但 spare 已规划 → use spare cells (metal only)
├── bug 在 RTL，spare 未规划，metal 有空间 → Logic ECO（部分 metal）
├── bug 在 RTL，spare 未规划，metal 无空间 → Mask Re-spin
├── 改 wire 顺序 → Metal only
└── 调时序细节 → Timing ECO
```

---

## 四、Power ECO：功耗修复与降低

### 4.1 Power ECO 的两类场景

**场景 A：IR Drop 应急修复**
- 触发：动态 IR drop 过大 → 时序失效
- 修复：**加 Decap** cell、**加宽 power rail**、**给 glitch 加 decoupling cap**

**场景 B：功耗预算超标**
- 触发：仿真估算功耗 > 预算 5%
- 修复：**Vt Swap**（SVT → HVT）、**Clock gating 加严**、**降低块电压（DVFS）**

### 4.2 Decap Cell 的工程经验

**Decap 分布策略**：
```
电源网络 decap 比例：
├── 高频区（CPU, GPU, DSP）：decaps × 5-8 倍
├── 高扇出区：decaps × 4 倍
├── 普通逻辑：decaps × 2 倍
└── SRAM 周边：不需要 (SRAM 自带 capacitor)
```

```tcl
# 添加 Decap cell
addDecapCells -area {100 100 200 200} -prefix "post_layout_decap" -cell DECAP4

# 检查分布
report_decap_distribution -threshold 0.001
```

### 4.3 Vt Swap 流程

```tcl
# Vt swap (Low Vt → High Vt) 减功耗
foreach cell [get_cells "LVT_*"] {
  # 把这个 cell 替换为 SVT 版本
  set hvt_cell [get_lib_cell [get_lib $cell]/[get_name $cell]*_HVT]
  swap_cell $cell $hvt_cell
}

# Vt swap (LVT → ULVT) 加 performance
foreach cell [get_cells "SVT_*_holdpath_violated"] {
  set lvt_cell [get_lib_cell ...]
  swap_cell $cell $lvt_cell
}

# 每次 swap 后重新 P&R（很小改动即可）
ecoPlace
update_timing
```

### 4.4 Power Grid Repair

```tcl
# 1. 显示 IR Drop map（需 Voltus / Redhawk）
analyze_ir_drop \
  -power {chip.vdd} \
  -ir_drop_threshold 0.05 \
  -report ir_drop.rpt

# 2. 修复 hot spots
add_power_strap -layer M5 -width 1 -pitch 50 -at "bouncing_block_X1Y2"

# 3. 重新 IR Drop 验证
analyze_ir_drop -power {chip.vdd}
```

---

## 五、Spare Cell Plan：ECO 的"预留单元格"

### 5.1 为什么必须有 Spare Cell Plan

**真实数据**：
- 5nm SoC：2500万门，spare 占 2-3% = **50-80万个 cell**
- 这些 spare 在 mask 阶段就 layout 完毕，**永远不动**
- 等到 ECO 时再调用，**完全 metal-only**

### 5.2 Spare Cell 的三大类型

| 类型 | 用途 | 占比 |
|---|---|---|
| `Spare Gate` (AND/OR/MUX) | 逻辑 ECO | 50% |
| `Spare Buffer` | 修复 hold 违例 | 30% |
| `Spare Inverter` | 反相 / topology 改 | 10% |
| `Spare Flip-Flop` | 寄存器 swap | 5% |
| `Spare Filler` | 物理 release | 5% |

### 5.3 Spare Cell 分布原则

**经验密度**：
```
按模块密度：
├── 普通逻辑：每 30 / 60 / 120 列部署一个 spare set
├── 关键时序区：每 30 列
├── 频繁改动的区域：每 30 列密集部署
└── SRAM 周围：0（让路 SRAM）
```

### 5.4 在综合阶段写 spare cell plan

```tcl
# 在 Genus 综合时插入 spare
# 综合 SDC 中：
# - allow_spare_cells = true
# - spare cell 密度
set_spare_cells \
  -cell_type {AND2_X1 OR2_X1 BUF_X1 INV_X1 DFF_X1} \
  -prefix "ECO_SPARE_" \
  -ratio 0.02

# 在 PT 中导入 spare 信息用于 ECO
read_spare_cells -file "spare_cell_list.txt"
```

---

## 六、ECO 闭环流程：从发现违例到修复完成

### 6.1 完整 ECO 闭环（标准）

```
[1] STA Setup/Hold 违例报告
      ↓
[2] 启动 ECO：Innovus → ecoPlace
      ↓
[3] 应用 spare cell / buffer 插入
      ↓
[4] ecoRoute（重新连接受影响 net）
      ↓
[5] ecoOptTiming（重新 PNR 优化）
      ↓
[6] update_timing + report_timing（验证）
      ↓
[7] Sign-off 验证（STA / PV / IR）
      ↓
[8] 生成 ECO 文件（Verilog/SDF/GDSII）
      ↓
[9] 提交给 foundary
```

### 6.2 Gate-level ECO 的 TCL 完整实现

```tcl
# ====================================
# 完整 ECO 流程 (Genus + Innovus)
# ====================================

# Step 1: 把 layout 后的 netlist 和 SDF 拉进来做 baseline
restoreDesign save_layout.enc timing.signoff.lef \
               -ref_libs my_tech.lib all_libs \
               -tluPlus tlu_plus

# Step 2: 确认 baseline timing
set_analysis_view -setup func_wc -hold func_bc
update_timing
report_timing -max_paths 100 -sort_by group > pre_eco_timing.rpt

# Step 3: 应用 ECO netlist（如果有功能修复）
# 加载前端修改后的 netlist
loadECO -netlist eco_modified.v -replace

# Step 4: 让 Innovus 自动做 eco
# 选项 1: 仅时序修复
setOptMode -fixDesign true -addBuffer true -moveCell true -changeCellFootprint true

# 选项 2: 全自动 ECO
# ecoPlace
# ecoRoute
# ecoOptTiming

# Step 5: 在特定区域/网表做优化（最常见）
ecoPlace -check_legality false -target violation_paths

# Step 6: 验证时序
update_timing
report_timing -delay max -path full -max_paths 1000 > post_eco_setup.rpt
report_timing -delay min -path full -max_paths 1000 > post_eco_hold.rpt

# Step 7: 输出 ECO 文件
saveDesign DRAWN_ECO.enc
write_netlist -output ECO_netlist.v
write_sdf -output ECO_chip.sdf
write_gdsii -output ECO_layout.gdsii

# Step 8: PV 验证
runCalibre -drc ECO_chip.gdsii       ;# DRC
runCalibre -lvs ECO_netlist.v netlist.lef ECO_layout.gdsii  ;# LVS
```

### 6.3 ECO 不同 fix 策略的性能对比

| 策略 | 修改面积 | 性能影响 | 适合 |
|---|---|---|---|
| **Spare Cell 替换** | 0 ~ 5% | 5ps | 所有 timing ECO |
| **Buffer Insertion** | 1 ~ 10% | 30ps | 高度违例 |
| **Vt Swap** | 0 | 10-30ps | 找目标 path |
| **Clock skew (useful)** | 0 | 0 物理改动 | setup |
| **新增 cell** | 5%+ | 50+ps | 突发违例 |

---

## 七、Innovus / ICC2 / Genus 的 ECO 自动化

### 7.1 Innovus 的 ECO 选项（推荐最常用）

```tcl
# ====================================
# Innovus ECO 完整配置
# ====================================

# 1. 设定 ECO 模式
setOptMode -trueEps true             ;# 真实 RC
setOptMode -effort high
setOptMode -maxUtil 0.85
setOptMode -fixDesign true
setOptMode -addBuffer true
setOptMode -moveCell true
setOptMode -changeCellFootprint true
setOptMode -sizeCell true
setOptMode -reclaimArea true

# 2. 时序ECO 全自动
setOptMode -maxOptTime 3600          ;# 1 小时自动优化
optDesign -preCTS
optDesign -postCTS
optDesign -postRouting

# 3. Holding violations fix
place_opt -hold
route_opt -hold

# 4. Holding path specifically
editHoldPath -path [list {hier_in1 ... hier_out1}]
```

### 7.2 Synopsys ICC2 的 ECO 选项

```tcl
# ICC2 ECO
set_app_options -name place_opt.flow.enable_effort_high -value true
optimize_eco_timing -setup
optimize_eco_timing -hold
place_eco_cells
route_eco
```

### 7.3 时序调试 TCL 模板

```tcl
# ============================
# 时序调试：哪条路径最难搞？
# ============================

# 1. 列出最差的 N 条路径
report_timing -delay max -max_paths 5 -path full -sort_by slack

# 2. 显示这条路径的 cell-by-cell 延迟
report_timing -delay max -max_paths 1 -path full -track -endpoints_first

# 3. 看 cell 上是否有 SI 噪声（时序违例可能源于 SI）
report_si -path_endpoint [list {DFF_2/D}] -above -below

# 4. 看 AOCV 是否生效
report_aocv -check

# 5. 看哪条 path 改了多久
trace_opt -eco -track path_id
```

---

## 八、ECO 闭环检查清单

### 8.1 ECO 修复前检查

```
□ ECO 触发原因明确（setup/hold/function/power）
□ 修复手段与 spare cell plan 一致
□ 阻断路径有完整诊断
□ 修改 Netlist 与 timing 工具版本匹配
□ Modified netlist 已经 validation 验证
```

### 8.2 ECO 修复后检查

```
□ 更新 timing 验证 slack
□ re-extract parasitics（如果动了金属层）
□ DRC 验证（calibre DRC）
□ LVS 验证（calibre LVS）
□ Re-run sign-off STA（含变化的 corner）
□ IR/EM 验证（如果改了 power grid）
□ 最后：sign-off 报告合并入主文档
```

### 8.3 一个真实 ECO 的工程时序

| 步骤 | 耗时 | 责任方 |
|---|---|---|
| 1. 收到 STA 违例报告 | t0 | FAE / DFT |
| 2. 诊断违例原因 | 半天 | PNR 工程师 |
| 3. 应用 ECO 策略 | 1 天 | PNR 工程师 |
| 4. Re-STA 检查 | 0.5 天 | STA 工程师 |
| 5. PV/DRC 检查 | 0.5 天 | PV 工程师 |
| 6. Sign-off 报告 | 0.5 天 | STA 工程师 |
| 7. 提交 foundary | 1 天 | 工程经理 |
| **总计** | **4-5 天** | — |

---

## 九、ECO 八股常考题目

### Q1：什么是 Spare Cell？为什么需要？

**答**：Pre-placement 阶段插入的"预留"stdcell。**目的是让 ECO 时只需改 metal 层，0 mask 重做**。
**应用**：Timing Fix + Function Fix。

### Q2：为什么 Function ECO 通常 Logic + Metal ECO？

**答**：功能修改需要改变 stdcell 数量或类型，所以必然 logic 变动；metal 仅当 Insert 时连接完整。

### Q3：useful skew 的工程含义？

**答**：通过调整 launch FF 的 clock path，让 T_capture_clk > T_launch_clk 适度走慢 Slack。

### Q4：怎么区分 DRC/LVS/ANT 失误与 timing 失误？

**答**：DRC 错 = 几何违规（最小间距、最小宽度）；LVS = netlist vs layout 不匹配；ANT = 天线违例 = 不在时序范围里。
**ECO 视角**：timing 失误优先用 metal-only，DRC/LVS 失误可能需改 mask。

### Q5：ECO 阶段如何避免"为 ECO 而 ECO"？

**答**：**严格遵守"metal-only 优先"原则**——metal 改不到才动 cell/mask。每一次 mask 改动增加 foundary 成本。

### Q6：金属 ECO 与 Logic ECO 的本质区别？

**答**：金属 ECO = M1/M2/M3 调，stdcell 不动；Logic ECO = stdcell 类型/数量改，必然牵动 routing。

### Q7：怎么做到 0 DFM IR-drop 修复？

**答**：Voltus 仿真 + analyze_ir_drop + 加 decap + 加宽 power rail。

### Q8：ECO 是否一定要重新 STA？

**答**：**是**。每次 metal / cell 改动必须 re-extract RC + re-STA，因为 routing 改了，对延迟影响不能忽略。

### Q9：何时放弃 ECO 改 Re-spin？

**答**：当 ECO 覆盖面积 > 30%，或 mask 改动 >= 5 层，或功能 bug 涉及全 chip，**应直接 re-spin**。

### Q10：Spare Cell 占比多少为宜？

**答**：
- 普通 IC：1% ~ 2%
- 复杂 SoC：2% ~ 5%
- 关键 bug-prone 模块：5% ~ 8%

---

## 你能在 1 个 ECO 项目之后用什么？

按"做 1 个 ECO 项目 → 会的话"排序：

| 阶段 | 能力 |
|---|---|
| 第 1 个月 | 看懂 ECO report，能操作 Innovus ECO 命令 |
| 第 3 个月 | 独立完成 setup/hold 修复，写完整 ECO 闭环 |
| 第 6 个月 | 写完整 Function ECO（Tcl），完成 spare cell 部署 |
| 第 12 个月 | 一手 IR Drop ECO + Power ECO；自动化 ECO 工具脚本 |

---

## 实战要避的 6 个坑

1. **不要在 ECO 时改 logic if not necessary** —— mask 改 = $10w+ 成本
2. **不要忽略 ECO 之后的 DRC** —— 修复了 timing 触发了 short，捡了芝麻丢了西瓜
3. **不要让 spare cell 永久地连到 VDD/GND** —— 必须 floating
4. **不要忘记 re-extract RC** —— ECO 改了 metal 必须 RC 重算
5. **不要把 spare cell 改为 active cell 后忘了 wire** —— ECO 不接 net = open
6. **不要在没有 sign-off 报告的情况下说 "done"** —— 经验之谈

---

> **本篇定位**：ECO 是工程的"实际工作日"。一次流片必出 ECO，把这里的工作掌握住是工程师的"**真实实力**"。
