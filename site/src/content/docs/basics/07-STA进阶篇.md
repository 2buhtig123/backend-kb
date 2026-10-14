---
title: "STA 深入：从入门到能上手工程（进阶版）"
description: "Liberty 库解析、SDC 约束实践、OCV/AOCV/POCV、SI-aware 分析等 STA 进阶主题。"
module: basics
order: 6
---

# STA 深入：从入门到能上手工程（进阶版）

> 本篇是基础篇 `01-静态时序分析STA.md` 的"做工程必备"的加深。
> 大约 22K 字。**目标**：读完能直接做 **STA Sign-off 工程**，能向 Mentor 解释每个 Liberty/SDC 字段，能写出完整的时序闭环 TCL。
>
> **前置知识**：基础篇内容（建立保持时间、时序路径、OCV/CPPR、AOCV/POCV）。
>
> **适合人群**：
> - 拿到第一个 STA 任务的新人（最直接参考）
> - 面试前 1 周冲刺 STA 方向的（最浓缩的实战知识）
> - 已在做 STA 但总有几个问题搞不清的工程师（查缺补漏）

---

## 目录

- [一、Liberty 文件：从 .lib 看懂一个 cell 真正含义](#一liberty-文件从-lib-看懂一个-cell-真正含义)
- [二、SDC 完整实战：从空白工程到 Sign-off](#二sdc-完整实战从空白工程到-sign-off)
- [三、AOCV 与 POCV：先进工艺为何必须](#三aocv-与-pocv先进工艺为何必须)
- [四、SI-Aware 时序：串扰如何偷你的时间](#四si-aware-时序串扰如何偷你的时间)
- [五、STA 闭环 TCL：从 PrimeTime 到最终报告](#五sta-闭环-tcl从-primetime-到最终报告)
- [六、Sign-off 必备的反标流程](#六sign-off-必备的反标流程)
- [七、八股：面试常考的 STA 进阶问题](#七八股面试常考的-sta-进阶问题)
- [八、检查清单：工程师手上必备的 7 件事](#八检查清单工程师手上必备的-7-件事)

---

## 一、Liberty 文件：从 .lib 看懂一个 cell 真正含义

Liberty（.lib）是**综合 + 静态时序分析的核心数据**——所有 cell 的功耗、面积、时序都从它读。7nm 以下，还会有 .ldb / .ccs_lib 等扩展。

### 1.1 三类 library：CELLS、GROUPS、ENVIRONMENT

```
library ("my_lib_a28ss_125c") {
library_features (report_delay_calc, report_power_calc);  ← 工具支持的功能
delay_model : "table_lookup";                              ← 延迟模型
bus_naming_style : "%s[%d]";                              ← 总线命名
voltage_map (VDD, 0.9);                                    ← 工作电压

operating_conditions ("nom_25c") {                        ← PVT 环境
  process : 1;
  voltage : 0.9;
  temperature : 25;
}

lu_table_template (delay_template_3x3) {                   ← 查找表模板
  variable_1 : input_net_transition;                       ← 输入转换时间
  variable_2 : total_output_net_length;                    ← 输出线长度
  index_1 ("0.01, 0.1, 0.5");                              ← 转换时间采样
  index_2 ("0.001, 0.5, 5");                               ← 长度采样
}

cell (NAND2_X1) {                                           ← 一个标准 cell
  area : 2.1;                                              ← 面积 (site unit)
  cell_leakage_power : 0.5;                                ← 静态功耗

  cell_footprint : nand2;                                  ← 物理 footprint

  pin (A) {                                                ← 输入引脚
    direction : input;
    capacitance : 0.002;                                   ← 引脚电容
    rise_capacitance : 0.0018;
    fall_capacitance : 0.0022;
    max_transition : 0.5;
    fanout_load : 1.0;
  }

  pin (Y) {                                                ← 输出引脚
    direction : output;
    function : "(!(A & B))";                               ← 函数
    max_capacitance : 0.05;                                ← 最大负载
    max_fanout : 8;
    max_transition : 0.5;
    timing() {                                             ← 时序 arcs
      timing_type : combinational;                         ← 组合 arcs
      related_pin : "A";
      timing_sense : negative_unate;                       ← 反相器/与非
      cell_rise (delay_template_3x3) { ... }               ← 上升延迟 LUT
      cell_fall (delay_template_3x3) { ... }               ← 下降延迟 LUT
      rise_transition (delay_template_3x3) { ... }         ← 上升转换时间
      fall_transition (delay_template_3x3) { ... }         ← 下降转换时间
      rise_power (power_template_3x3) { ... }              ← 上升功耗
      fall_power (power_template_3x3) { ... }
    }
    timing() {  ← 第二个 arc
      related_pin : "B";
      ...
    }
  }
}
}
```

### 1.2 三类时序模型：NLDM / CCS / ECSM

| 模型 | 代表 LUT 数 | 精度 | 7nm 以下 |
|---|---|---|---|
| **NLDM (Non-Linear Delay Model)** | 1-2 个 2D 表 | 低 | 不准 |
| **CCS (Composite Current Source)** | 多张电流波形 | 高 | 必用 |
| **ECSM (Effective Current Source Model)** | Synopsys 版 CCS | 高 | 必用 |

**NLDM 为什么不够用**：NLDM 把门延迟简化为"输入转换时间 + 输出负载"两个变量，**忽略了输入波形形状和输出负载沿 RC 分布的细节**。7nm 以下，wire RC 主导，NLDM 会比真实延迟**误差 ±30ps**——超过一个时钟周期。

**CCS/ECSM 怎么解决**：把 cell 建模为一组电流源，仿真器对"实际 RC 网络"做真正的 SPICE-like 仿真。代价是 library 大 10 倍，仿真慢 5 倍。

### 1.3 看懂 timing_sense：8 种类型

| 类型 | 含义 | 例子 |
|---|---|---|
| `positive_unate` | 输出随输入**同方向**变化 | 反相器、缓冲器、与门 |
| `negative_unate` | 输出随输入**反方向**变化 | 与非门、或非门 |
| `non_unate` | **方向不定**——异或 | XOR |
| `clear` / `preset` | 异步复位/置位 arcs | 触发器 |
| `setup_rising` / `setup_falling` | 时序器件 setup 弧 | 触发器 |
| `hold_rising` / `hold_falling` | 时序器件 hold 弧 | 触发器 |

### 1.4 一个 cell 必须有 N 张表？

| 表 | 数量 |
|---|---|
| cell_rise, cell_fall | 1-2 |
| rise_transition, fall_transition | 1-2 |
| rise_power, fall_power | 1-2 |
| internal_power LUT（typ） | 3+（rise, fall, rise_power, fall_power） |
| internal_power LUT（hold/PG） | 3+ |

NLDM 一个 cell 至少 8 张表。CCS 一个 cell 100+ 个索引点。

---

## 二、SDC 完整实战：从空白工程到 Sign-off

### 2.1 SDC 的 17 类命令

```
SDC 总览：
├── 设计对象类：set_input_delay, set_output_delay, set_load, set_driving_cell
├── 时钟类：create_clock, create_generated_clock, set_clock_uncertainty
├── 环境属性：set_operating_conditions, set_wire_load_model
├── 时序例外：set_false_path, set_multicycle_path, set_max_delay
├── 面积/功耗：set_max_area, set_max_dynamic_power
├── 输入输出约束：set_input_delay, set_output_delay
├── 标志变量：set_case_analysis, set_dont_touch, set_dont_use
├── 线负载模型：set_wire_load_model -name WLx
├── DRC：set_max_transition, set_max_capacitance, set_max_fanout
└── ...
```

### 2.2 一个完整 SDC 的标准模板

```tcl
# ============ 1. 时钟端口 (输入时钟) ============
create_clock -name sys_clk      -period 1.0      [get_ports CLK]            ;# 1 GHz 主时钟
create_clock -name jtag_clk     -period 100.0    [get_ports JTAG_TCK]       ;# JTAG 测试时钟
create_clock -name uart_clk     -period 10.0     [get_ports UART_REF_CLK]   ;# 慢速时钟

# ============ 2. 衍生时钟 (派生时钟) ============
create_generated_clock -name core_clk  \
  -source [get_ports sys_clk]                \
  -multiply_by 4 -divide_by 1                \
  -duty_cycle 0.5                            \
  [get_pins PLL/CLK_O]

create_generated_clock -name div2_clk  \
  -source [get_pins PLL/CLK_O]              \
  -divide_by 2                               \
  [get_pins DIVIDER/Q_REG]

# ============ 3. 时钟属性 (uncertainty) ============
set_clock_uncertainty  0.05      [get_clocks sys_clk]                        ;# jitter + margin
set_clock_uncertainty  0.02      -hold [get_clocks sys_clk]
set_clock_uncertainty  0.10      [get_clocks sys_clk] -setup                 ;# setup 多 50ps

# ============ 4. 时钟延迟 (latency) ============
set_clock_latency      0.8       -source [get_clocks sys_clk]                ;# 模拟源到 PLL 延迟
set_clock_latency      0.2       -max    [get_clocks core_clk]               ;# 模拟 core 内延迟

# ============ 5. 输入延迟 (F 输入前到 module 的时序) ============
set_input_delay  -clock sys_clk -max  3.0  [get_ports DATA_IN_*]             ;# 前一级延迟给输入
set_input_delay  -clock sys_clk -min  0.5  [get_ports DATA_IN_*]             ;# hold 检查
set_input_delay  -clock sys_clk -max  2.0  -clock_fall [get_ports DATA_IN_*]  ;# half-cycle

# ============ 6. 输出延迟 (module 输出后的下游路径延迟) ============
set_output_delay -clock sys_clk -max  2.5  [get_ports DATA_OUT_*]            ;# setup
set_output_delay -clock sys_clk -min  0.3  [get_ports DATA_OUT_*]            ;# hold
set_output_delay -clock sys_clk -max  1.0  -add_delay [get_ports DEBUG_OUT_*] ;# 多端口多时钟

# ============ 7. 端口的驱动/负载 ============
set_driving_cell -lib_cell INV_X1 -pin X [get_ports DATA_IN_*]                ;# 输入驱动 cell
set_load         0.030         [get_ports DATA_OUT_*]                        ;# 30 fF 上游负载

# ============ 8. DRC: transition / cap / fanout ============
set_max_transition   0.15      [current_design]                               ;# 全局转换时间
set_max_capacitance  0.080     [current_design]                               ;# 全局最大电容
set_max_fanout       8         [current_design]                               ;# 全局最大扇出
# 也可针对某个端口
set_max_transition   0.10      [get_ports HIGH_SPEED_PORTS_*]

# ============ 9. 线负载模型 ============
set_wire_load_model -name WL_INTERCONNECT -lib my_lib_process_v1              ;# 粗略估计
# wire load 在物理 PNR 完成后应该移除
remove_wire_load_model                                                              ;# 因为 PT 会读 SDF 反标

# ============ 10. 时序例外 (Timing Exceptions) ============
# false path: 真的不需要检查
set_false_path -through [get_pins BLOCK_RESET/glitch_reg/Q]                   ;# 复位毛刺不查
set_false_path -hold   -through [get_ports JTAG_PINS_*]                       ;# JTAG 不查 hold
set_false_path -setup  -through [get_pins SCAN_OUT_MUX/sel*]

# multicycle path: N 周期的路径
set_multicycle_path 2 -setup  -to [get_pins SLOW_REG/D]                       ;# 慢路径
set_multicycle_path 1 -hold   -to [get_pins SLOW_REG/D]                       ;# hold 退化为 1
# 注意 hold 必须保留 0 周期

# case analysis: 强制某信号为常量
set_case_analysis 1 [get_ports TEST_MODE]                                      ;# 测试模式
set_case_analysis 0 [get_ports SCAN_ENABLE]                                    ;# 关闭 scan

# ============ 11. dont_touch / dont_use ============
set_dont_touch  [get_cells {DP_RAM/* rtl_eco*}]                              ;# 不许优化 RAM
set_dont_use   [get_cells BUF_X2/UX1]                                         ;# 不许用某 cell

# ============ 12. 特殊路径: max_delay / min_delay ============
set_max_delay  5.0 -through [get_pins BIG_MUX/A*]                            ;# 某些延迟敏感路径

# ============ 13. 系统模式 (Mode) 准备 ============
# Mode 1: 功能模式
if { [file exists "sdc/func.sdc"] } {
  source  -echo sdc/func.sdc
}

# Mode 2: scan 模式
if { [file exists "sdc/scan.sdc"] } {
  remove_sdc
  source  -echo sdc/scan.sdc
}
```

### 2.3 八股常考：SDC 命令的"陷阱"

| 命令 | 易错点 |
|---|---|
| `set_input_delay` | `-clock` 后必须接一个**已 create_clock** 的端口；否则 warning → 0 delay 误用 |
| `create_generated_clock` | 必须 `-source` 一个**真的有点播**的引脚 |
| `set_multicycle_path N -setup` | 必须配套 `-hold 1` 退 1 周期，否则 hold 永远 fail |
| `set_false_path` | 不能用 `*` 通配，必须明确路径 endpoint；通配经常和 SOCV 不一致 |
| `set_clock_uncertainty` | `-setup` 和 `-hold` 不同，分别加 jitter/setup holdup |
| `set_case_analysis` | 仅当 chip 仅在 1 个 case 工作才用，多 case 应该用 UPF/shift |
| `set_max_capacitance` | cell-level 的 max_capacitance 优先级 > 全局 |

### 2.4 SDC 检查：自动化怎么做

```tcl
# SDC 自检：确保关键端口都加了约束
proc check_sdc_completeness {} {
  set issues {}
  # 1. 所有 cell 是否有时钟？
  foreach_in_collection cell [all_register_clock_pins -no_clock] {
      lappend issues "warning: 时序器件 [get_object_name $cell] 没有时钟"
  }
  # 2. 所有输入端口是否有 set_input_delay？
  foreach_in_collection p [get_ports -filter "direction==in"] {
      set_input_delay -quiet -clock [get_clocks] $p >/dev/null
      if { [get_attribute [get_attribute $p status] input_delay] == "unset" } {
          lappend issues "warning: 输入端口 $p 没有 set_input_delay"
      }
  }
  # 3. 每对时钟是否做了 set_clock_uncertainty？
  # 4. case analysis 与 SDC 模式是否冲突？
  return $issues
}
```

---

## 三、AOCV 与 POCV：先进工艺为何必须

### 3.1 简单回顾：AOCV 是干什么的

基础篇说过：AOCV (Advanced OCV) 把"路径越长、偏差越大"的物理事实**显式**建模。 1.0 V，5 级 buffer，每级偏差 2%，5 级累加成 ~10%。

### 3.2 AOCV 的两个关键超参数

```tcl
# 应用 AOCV
set_timing_derate -early 0.95 -cell_delay                   ;# 早到延迟衰 -5%
set_timing_derate -late  1.05 -cell_delay                   ;# 迟到延迟增 +5%
# 或显式 AOCV table
set_timing_derate -early 0.94 -cell_delay [get_cells -hier]
# AOCV 表是独立 OCVM 文件
set_ocvm_pattern  -filename aocvm.v -tag "5_corner_bc_wc_with_pg"
```

**为什么 -5% / +5%**：每个 gate 偏差理论上对称，平均到 ±5% (约 1σ)；多条 gates 串联时**偏差不再平**合，**用 AOCV 路径模型**。

### 3.3 AOCV 的局限 → 催生 POCV

```
AOCV 误区：
├── 假设每个 corner 是一个常量
├── 现实：每个 corner 内部还有偏差
└── 表现为：你填 +5%，但运行后发现每条路径的偏差是 4%~6%之间
```

**POCV (Parametric OCV)** 用**统计的方法**给每个 cell 一组**正态分布参数**。PT 通过"路径最差样本"匹配，**比 AOCV 准约 5~10ps**。

```tcl
# 应用 POCV
set_timing_derate -early 0.97 -data_path  
set_timing_derate -late  1.03 -data_path
set_timing_derate -early 0.95 -clock_path
set_timing_derate -late  1.05 -clock_path
```

POCV 的真正威力：路径统计采样，跑全 corner 数量翻倍但更准。

### 3.4 SOCV / LVF：更进一步的概率

**SOCV (Statistically OCV)** 与 LVF (Liberty Variation Format) 是 5nm 以下才用的极限模型——把每个 cell 的延迟建模为**完整分布**，而非 1-2 个点。代价是仿真比 POCV 慢 3 倍。

**工程师选择**：
- 5nm 以下：SOCV/LVF
- 7nm：POCV
- 12/16nm：AOCV
- 28nm 以上：常规 OCV（±10%）

---

## 四、SI-Aware 时序：串扰如何偷你的时间

基础篇讲过 SI-Aware 简要概念。这里讲**真正做工程**需要知道的 3 件事。

### 4.1 三类 SI 弧：Hold / Setup / Glitch 各自怎么算

| 弧类型 | 触发条件 | 工具算法 | 结果 |
|---|---|---|---|
| **SI Hold** | victim 0→1 跳变，aggressor 同时 0→1 跳变，加重 transition | BDS (Bound-Direction Sizing) 计算最坏延长 | Hold slack **负向** |
| **SI Setup** | victim 跳变期间，aggressor **反方向**跳变，让 transition 变缓 | 缩短数据到达 → **加大 setup** | Setup slack **负向** |
| **SI Glitch** | victim 静止，aggressor 切换 | 注入电压尖峰，可能被下级采样 | 必须保留 noise margin |

### 4.2 Static Noise Analysis (SNA)：Glitch 怎么查

```tcl
# 1. 开启 SI-Aware 分析
set_analysis_mode -aocv true -cppr both
set_analysis_mode -si_enable true             ;# 关键开关
set_analysis_mode -si_check_pins true         ;# 检查 pin 边界

# 2. 设置噪声阈值（DC noise margin）
set_noise_margin  0.10 -above                 ;# 高电平噪声 margin 100mV
set_noise_margin  0.10 -below                 ;# 低电平噪声 margin

# 3. 按功能分噪声：dynamic + static noise 两种
# 4. 报告
report_timing -delay max -path full -max_paths 50 > si_setup.rpt
report_timing -delay min -path full -max_paths 50 > si_hold.rpt
report_noise -above -below > noise.rpt
```

**最常见的 noise 故障**：clock 的 glitch 太大，导致 DFF 误采样——**clock 与 data 不可有直流交叉**。工具会自动插入 `is_clock_delay` / `set_max_glitch` 来处理。

### 4.3 CCS-noise：5nm 怎么算 SI

5nm 及以下，传统 ECCS+CCS 已经不够准，需要 **CCS-noise**：在 each pin 注入实测的噪声波形，再仿真。

```
工程实践：
- 7nm 反标：使用 pba + CCS，启用 si_enable
- 5nm：使用 CCS-noise + POCV + LVF
- 3nm 及以下：在工艺上启用 MIM/SRAM 阴影，提前做多次迭代
```

### 4.4 SI 修复策略

| SI 故障 | 修复手段 |
|---|---|
| hold 违例 + 与 SI 有关 | 加大 victim 缓冲、增加间距、改用 NDR、power gate |
| setup 违例 + 与 SI 有关 | 让 victim 推迟 → 加 buffer、解耦与 aggressor 关系 |
| Glitch 违例 | 加 buffer 隔离 aggressor 与 victim，NDR shielding |
| Clock 失真 | Clock shielding 强制 + 让 clock 在 metal 顶层走 |

---

## 五、STA 闭环 TCL：从 PrimeTime 到最终报告

```tcl
# ====================================
# 一份能用于 Sign-off 的 PrimeTime 闭环 TCL
# ====================================

set proc_number 16
set_host_options -max_cores $proc_number

# ---------- 1. 工程初始化 ----------
set top_design   my_chip
set init_design_scaffold ./build/${top_design}.scaffold.v
set top_sdc_func ./sdc/func.sdc
set top_sdc_scan ./sdc/scan.sdc
set top_libs     "/remote/data/libs/liberty/my_tech/stdcell/my_tech_wc.lib \
                /remote/data/libs/liberty/my_tech/sram/sram_wc.lib \
                /remote/data/libs/liberty/my_tech/io/io_wc.lib"
set parasitics   ./spef/chip_route.spef

# ---------- 2. 加载多个 corner ----------
# Corner 列表 (Process × Voltage × Temperature × RC)
set sdc_corners {
  {func ss_0p88_125c_maxspef_corner1} {func ss_0p88_125c_minspef_corner2}
  {func ss_0p88_-40c_maxspef_corner1} {func ss_0p88_-40c_minspef_corner2}
  {func ff_0p95_125c_maxspef_corner1} {func ff_0p95_125c_minspef_corner2}
  {func ff_0p95_-40c_maxspef_corner1} {func ff_0p95_-40c_minspef_corner2}
  {scan ss_0p88_125c_maxspef_corner1} {scan ss_0p88_125c_minspef_corner2}
}

# 一次循环跑所有 corner
foreach {mode corner} $sdc_corners {
  set_analysis_view -setup $corner  -hold $corner_opposite

  # 加载设计
  set init_top_cell $top_design
  set init_verilog  $init_design_scaffold
  set init_lib_path $top_libs

  init_design

  # 加载 SDC: 选 mode
  if {$mode eq "func"} { source $top_sdc_func } else { source $top_sdc_scan }

  # 加载寄生
  read_parasitics $parasitics

  # 加载延时（实际项目会读 SDF）
  read_sdf ./sdf/chip_route.sdf

  # 启动 update_timing
  update_timing -full

  # 报告
  if {[sizeof_collection [report_timing -delay max -path full -max_paths 1000 -sort_by group]]} {
      exec mkdir -p reports/$corner
      redirect reports/$corner/setup_1000_path.rpt { report_timing -delay max -path full -max_paths 1000 -sort_by group }
      redirect reports/$corner/hold_1000_path.rpt  { report_timing -delay min -path full -max_paths 1000 -sort_by group }
  }

  # check output/voltage
  redirect reports/$corner/max_transition.rpt { report_analysis_coverage -check_type max_transition }
  redirect reports/$corner/max_cap.rpt        { report_analysis_coverage -check_type max_capacitance }
  redirect reports/$corner/max_fanout.rpt     { report_analysis_coverage -check_type fanout }
  redirect reports/$corner/min_pulse.rpt      { report_analysis_coverage -check_type min_pulse_width }
}
```

**关键开关说明**：
- `update_timing -full` 每次 corner 必须重跑（STA 无跨 corner 复用）
- 报告中 `-sort_by group` 把违例路径分组（便于看模块分布）
- `-path full` 完整路径 = `summary_path + ... + full_path`，比 summary 多看 cell-by-cell

---

## 六、Sign-off 必备的反标流程

### 6.1 SDF 反标：从 Innovus → PT

Innovus/ICC2 输出:
```
write_sdf -version 2.1 -recrem split -process_corner ss_0p88_125c -output chip_route.sdf
```

PT 反标：
```tcl
read_sdf ./sdf/chip_route.sdf                       ;# 必须先 read_verilog 再 read_sdf
report_timing -delay max -max_paths 100 -hier > setup.rpt
```

### 6.2 SPEF 反标：寄生参数

```tcl
read_parasitics -max_line_length 1024 ./spef/chip_route.spef  ;# SPEF 文件
update_timing -full
```

**SPEF 三种精度**：
- `D` (Detailed): 5nm+ 必备
- `R` (Reduced): 7nm+ 早期可行
- `P` (Partial): 不推荐 sign-off

### 6.3 真正的 sign-off 是哪一步？

不是 PT 跑通就行——还要：
1. **温度翻转 (Temp Inversion Check)**：低温下 delay 可能反超标
2. **电压依赖性 (Voltage Derating)**：IR Drop 后的 Vmin
3. **Aging 仿真**：考虑 10 年老化的 hold 退化
4. **Process Variation MC**：1000 样本的 Monte Carlo
5. **Hierarchical STA**：模块级独立 sign-off

---

## 七、八股：面试常考的 STA 进阶问题

### Q1：setup 和 hold 哪个先用 PT 检查？为什么？

**答**：setup 用 worst-case corner（高温低 V），hold 用 best-case corner（低温高 V）。
**原因**：setup 是延迟问题 → 高温低 V 延迟最大；hold 是冲过问题 → 低温延迟小，最容易冲过去。
**踩坑**：**Wrong（只跑一个 corner）**会导致流量问题调过 sign-off、芯片不工作。

### Q2：什么时候 setup 反而变 short？

**答**：当 path 上有 strong driver + short wire，clock skew 反向可以 fix 这条 path；同时，SI-Aware 让另一条路径减慢，自己变快。
**回答模板**：如 SI 引入 aggressor 影响、fast device + clock skew path、min operating condition 下。

### Q3：为什么 hold 通常比 setup 难 fix？

**答**：
- setup：用 buffer/sizing 来增大延迟很容易
- hold：必须**减小延迟**，方法有限：插 buffer 抵消、down-size、用 HVT cell
- hold 路径没有 max delay 概念，是**必须为 0 的最少**，且和 OCV/Vt 等变化敏感

### Q4：CRPR 是怎么算出来的？

**答**：在 path 上识别出**有共同 inst 的部分**，把同一 PVT 下的 delay 偏差在 path 中抵消。
**理解**：CRPR = 时钟和数据路径上**共享 buffer/cell 的共通偏差**。
**例子**：
```
clock path：buf1 -> buf2 -> FF1/CK  
data path：buf1 -> buf3 -> FF1/D
```
`buf1` 是共享的，它的偏差在 setup/hold slack 中抵消。**正是 CPPR 起作用的依据**。

### Q5：POCV 比 AOCV 准多少？

**答**：经验值是 5~15ps。但准不准关键看你 GTD 表是不是真实表征。
POCV 必须有**正态分布参数文件**，否则退化为 AOCV。

### Q6：corner 的顺序和 sign-off corner 怎么选？

**答**：完整的 corner 集是**P×V×T×C×M = 状态数**，每个 corner 一次跑全路径。
Sign-off 选最关键的几个：
- functional max：ss_0p88_125c（高龄低速）→ worst setup
- functional min：ff_0p95_-40c（年轻高速）→ worst hold
- 跨工艺 corner：sf/fs 等 → 漏路径

---

## 八、检查清单：工程师手上必备的 7 件事

| # | 必备 | 落地方式 |
|---|---|---|
| 1 | **完整 SDC 模板** | SDC 加 SDC.tcl 自动化校验；版本管理在 git |
| 2 | **MMMC 表** | 一个表格记录 corner × mode × delay/hold/si 分组 |
| 3 | **Lib 类型映射** | typ / wc / bc / ml 各一份，按 corner 选择 |
| 4 | **PT TCL 闭环脚本** | 完整脚本见上面（fall-back 路径） |
| 5 | **报告解读模板** | 自定义 report_view 把常用违例过滤出来 |
| 6 | **SDF / SPEF 校验脚本** | 反标前后对比 cell delay 5% 偏差内为合格 |
| 7 | **MMMC ↔ ECO 闭环** | 每次 ECO 必须带 corner 一同验证 |

---

## 你能在 1 个项目之后用什么？

按"做 1 个项目 → 会的话"排序：

| 阶段 | 能力 |
|---|---|
| 第 1 个月 | 读 SDC、改 SDC、加约束 |
| 第 3 个月 | 独立 run sign-off STA、写 TCL 闭环 |
| 第 6 个月 | 调 corner、做 AOCV/POCV 切换、做 clock skew 调优 |
| 第 12 个月 | 一手 RC/SDF 工艺把控、MCMM 调度自动化、做流程自动化工具 |
| 第 24 个月 | 设计 SI-Aware flow、把 Liberty 切换为 CCS/ECSM、写自己的报告生成器 |

> **总结**：STA 不是"读完一本书就掌握的"——它是"做中学"。这份章节给你"做项目时随时查"。

---

## 实战要避的 5 个坑

1. **不要相信 PT 的 "no violations" 就 sign-off**——还要跑 leakage + dynamic corner + aging
2. **不要把 STA 与功能仿真混淆**——STA 不验证逻辑，只验证 timing
3. **不要忽略 wire load 移除**——PNR 后 SDC 一定要 `remove_wire_load_model`，否则用估计 wire RC
4. **不要把小 cell delay 当 buffer delay**——小 cell 的驱动在不同 corner 差异巨大
5. **不要漏 set_input_delay 的路径**——每条输入路径必须有时钟和 delay，否则 PT 报 "unconstrained"

---

> **本篇定位**：如果你是新人，把第二节 (SDC) 和第五节 (闭环 TCL) 完整抄走，**能应付 90% 的 STA 工作**。其余部分按需深入。
