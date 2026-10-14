---
title: "Sign-off 综述：时序、物理、功耗与可靠性"
description: "量产前 Sign-off 全景：时序签核、物理验证、功耗完整性、可靠性检查与 tape-out 时间线。"
module: basics
order: 9
---

# Sign-off 综述：时序、物理、功耗与可靠性

> "所有违例都修完了，sign-off 报告一交，是不是就可以流片了？"  
> **不一定**。Sign-off 不只是"某一项不违例"——它是 STA / IR / EM / PV / DFM 五大检查 **同时**通过、跨工具**互相验证**才合格。
>
> 本章是基础篇 5 (物理验证 PV)、7 (STA 进阶)、9 (ECO) 三个章节的横向串联。  
> **目标**：读完能**作为 Sign-off Lead 主导一个完整 chip 的 sign-off**。
>
> **前置知识**：STA + ECO 基础概念。
> **适合**：3+ 年经验工程师、Sign-off Engineer 角色、想当 PM 的资深工程师。

---

## 目录

- [一、Sign-off 的 5 大检查与 4 个时间节点](#一sign-off-的-5-大检查与-4-个时间节点)
- [二、Sign-off 工程师的"必备交付物"清单](#二sign-off-工程师的"必备交付物"清单)
- [三、STA Sign-off：MMMC + AOCV + SI + Aging](#三sta-sign-offmmmc--aocv--si--aging)
- [四、IR / EM Sign-off：电源网格的体检报告](#四ir--em-sign-off电源网格的体检报告)
- [五、PV / DRC / LVS / ANT：版图到 GDSII 的最后关](#五pv--drc--lvs--ant版图到-gdsii-的最后关)
- [六、Sign-off 自动化：闭环脚本骨架](#六sign-off-自动化闭环脚本骨架)
- [七、AI 时代的 Sign-off：Cerebrus / DSO.ai 的入侵](#七ai-时代的-sign-offcerebrus--dsoai-的入侵)
- [八、八股常考 Sign-off 题目](#八八股常考-sign-off-题目)

---

## 一、Sign-off 的 5 大检查与 4 个时间节点

### 1.1 五大 Sign-off 检查清单

| # | 检查项 | 工具 | 通过标准 | 失败后果 |
|---|---|---|---|---|
| **1** | STA（建立保持）| PrimeTime / Tempus | 所有 corner × mode slack >= 0 | 时序违例 → chip 速度不及预期 |
| **2** | Power Integrity / IR | Voltus / RedHawk | IR drop ≤ 5% VDD | 芯片局部不工作 |
| **3** | EM（电迁移） | Voltus / RedHawk | 平均电流密度 ≤ 65% 限值 | 长期使用金属断裂 |
| **4** | PV（DRC/LVS/ANT） | Calibre / Pegasus | 0 violations | 制造失败 / 短路 |
| **5** | DFM（良率导向）| Calibre DFM | 0 critical violations | 良率低 / 漏检 |

### 1.2 4 个时间节点（关键里程碑）

```
Tape-out 倒推时间轴（5nm 实际）：

T0-6 月：设计阶段 RTL 完成
   ↓
T0-3 月：Floorplan + Initial PNR 完成
   ↓
T0-2 月：Hard IP + Initial Sign-off（preliminary）
   ↓
T0-1 月：Final Sign-off（完整 5 大检查）
   ↓
T0：   Final GDSII 上传到 foundary
   ↓
T0+1.5-3 月：Foundary 回片（量产硅）
   ↓
T0+6 月：量产
```

**Sign-off Lead 必须在 T0-2 月就介入**，不能等到 T0-1 月。

### 1.3 5 大检查的相互约束

```
STA 依赖 → IR data（IR drop 影响 cell VDD）
IR 依赖  → Place data / power grid
EM 依赖  → Power grid + signal routing
PV 依赖  → Place + Route 完整 GDSII
DFM 依赖 → Final routing
```

**关键**：每次重大修复（如 ECO）必须 **5 大检查重做一遍**，不能只做一项。

---

## 二、Sign-off 工程师的"必备交付物"清单

### 2.1 项目交付物清单（按阶段）

#### Pre-Sign-off（T0-3 月）
```
□ Floorplan 文档（placement density, macro placement, RDL routing）
□ Clock Tree 报告（skew, latency, latency variation）
□ 初步 MMMC 表
□ Power Plan（PG rail 宽度、间距）
□ Early DRC：floorplan 后第一轮
```

#### Final Sign-off（T0-1 月）
```
□ Final netlist（gate-level + stripped scan） + SDF
□ SPEF 文件（dspf / rdsf / map）
□ Liberty 文件（worst / best / nominal / 各 PVT）
□ SDC 文件（per mode：func / scan / bypass）
□ AOCV / POCV table（per PVT）
□ 最终 MMMC 表（corner × mode matrix）
□ STA Sign-off 报告
□ IR Drop 报告（power + ground）
□ EM 报告
□ Calibre DRC 报告
□ Calibre LVS 报告
□ ANT / ESD report
□ DFM 报告（自定 criteria）
□ GDSII（二进制）
□ GDSII checksum 文件
□ Timing verification letter（签发）
□ IR verification letter（签发）
□ LVS signoff letter（签发）
```

### 2.2 重要 letter 范例

```
Timing Sign-off Letter
====================
To: Foundry XX
Date: 2026-10-XX
Subject: [Project Chip X] Timing Sign-off Confirmation

Dear X,

We confirm that [Project X] meets all timing requirements:

1. Top Level SDC validated per sign-off corners (4 func + 4 scan)
2. All paths have non-negative slack
3. Min pulse width check: pass
4. AOCV + SI-Aware enabled
5. Aging analysis: 5-year (commercial) margin met

Signed: [Timing Engineer], [Sign-off Lead]
```

**真实情况**：letter 要签发**多次**（preliminary / final / pre-tapeout）—— 这是法律文件，给 foundary 做凭证。

### 2.3 Sign-off 数据库

| 字段 | 含义 |
|---|---|
| design_name | chip name |
| corner | wc / bc / lowV / aged / etc |
| mode | func / scan / bypass |
| view | setup / hold |
| slack_target | > 0 |
| slack_min | 最差 slack |
| vio_count | 违例数 |
| sign_off_date | sign-off 日期 |
| engineer | 责任人 |
| tool_version | PT 2024.12 / Calibre 2023.4 |
| library_version | lib 2024Q3 |
| AOCV_version | aocvm_2024Q3 |

**真实场景**：每个 chip 一个 sign-off database。**每次 sign-off 留存**。这是 audit trail，应对客户投诉 & foundary 退件。

---

## 三、STA Sign-off：MMMC + AOCV + SI + Aging

### 3.1 STA Sign-off 4 个核心动作

| 动作 | 标准 |
|---|---|
| Load all corners | 全 corner × mode 加载成功 |
| Run setup / hold | 每 corner 跑两遍 setup + hold |
| Run min pulse width / glitch | 必跑 |
| Run aging-aware cell delay | 5/10/15 年老化分别跑 |

### 3.2 完整 STA Sign-off TCL（来自 v0.7 章节）

详见 STA 进阶章节。一个真正的 sign-off script 必须包含：

```tcl
# 一份能用于 Sign-off 的 PrimeTime 闭环 TCL
proc run_signoff { corner mode } {
  set_analysis_view -setup $corner -hold $corner_opposite
    
  # 加载对应 SDC
  if {$mode eq "func"} { source $top_sdc_func } else { source $top_sdc_scan }
    
  # 读 netlist + lib + SPEF + SDF
  read_verilog  $top_netlist
  read_parasitics ./spef/$corner.spef
  read_sdf       ./sdf/$corner.sdf
    
  update_timing -full
    
  # 三类报告
  redirect reports/setup_${corner}_${mode}.rpt { 
      report_timing -delay max -max_paths 1000 -sort_by group 
  }
  redirect reports/hold_${corner}_${mode}.rpt { 
      report_timing -delay min -max_paths 1000 -sort_by group 
  }
  redirect reports/min_pulse_${corner}_${mode}.rpt { 
      report_analysis_coverage -check_type min_pulse_width 
  }
}

# 跑全 MMMC
foreach corner $all_corners {
  foreach mode $all_modes {
      run_signoff $corner $mode
  }
}
```

### 3.3 Aging 仿真：5 年后的 hold 还能 hold？

```
NBTI (Negative Bias Temperature Instability)：
- PMOS 在负偏压下老化
- 5 年老化降低 Vth 5~10%
- 影响：cell 变慢，hold slack 减少

PBTI (Positive Bias Temperature Instability)：
- NMOS 在正偏压下老化（5nm 后显著）
- 同样影响 cell delay

HCI (Hot Carrier Injection)：
- 高速 1-0 跳变加速老化
- 用 toggle rate × years 估算

工具：PT 有 `set_aging_timing_derate` 等命令
```

```tcl
# PT 加老化效应
set_app_options -name time.enable_aocv -value true
set_app_options -name time.pocvm_aging_aware -value true
set_app_options -name time.enable_nbti_aging -value true
# 5 年老化
set_app_options -name time.aging_nbti_years -value 5
# 重新跑
set_analysis_view -setup $corner_aged5y -hold $corner_bc
update_timing
report_timing -delay min -max_paths 1000
```

### 3.4 SI-Aware 的最后一道闸

```tcl
# 全 chip 的静态噪声分析
report_analysis_coverage -check_type min_pulse_width
report_analysis_coverage -check_type noise_glitch
# 噪声裕度
report_noise -above -below -hier > noise.rpt

# 修复流程：report → 检查 SI 违例 → 加 buffer / NDR / shielding
```

### 3.5 STA Sign-off 闭环不通过的可能原因

| 现象 | 根因 |
|---|---|
| 一个 corner 全部 setup 违例 | MMMC 配置错 / lib 加载错 |
| hold 违例但是路径在不同步 | OCV 配置错 / CPPR 不启用 |
| 一个 corner 路径数变少 | SPEF 没读 / SDC 没 source |
| aging 后 hold 全违例 | OCR derate 太保守 / aging table 加载错 |
| SI 违例高 | coupling cap 加载错 / shielding 不充分 |

---

## 四、IR / EM Sign-off：电源网格的体检报告

### 4.1 IR Drop 的两类

| 类型 | 含义 | 限值 |
|---|---|---|
| **Static IR** | 平均电流下的电压降 | < 30 mV (3% VDD) |
| **Dynamic IR** | 瞬态电流尖峰 | < 50 mV (5% VDD) |

**判断标准**：dynamic 更关键，因为 peak current 可能让本地 VDD 跌落。

### 4.2 Voltus Sign-off 全流程

```tcl
# Cadence Voltus：电源完整性仿真
# 1. 加 power net
set_db power_nets [get_nets {VDD VSS}]
set_db ground_nets [get_nets VSS]

# 2. 加载 Power Library + SPEF
read_lib power.lib
read_spef -rdsf power_routing.spef

# 3. 加 stimulus
# VCD / FSDB 文件提供真实工作电流
read_vcd -strip /path/to/waveform.vcd
set_switching_activity -global 0.3

# 4. 解算
analyze_ir_drop
analyze_em

# 5. 报告
report_ir_drop -corner {wc_setup} -threshold 0.05
report_em       -corner {wc_setup} -threshold 0.70
```

### 4.3 Decap 自动插入策略

```tcl
# Decap 部署 vs IR Drop hot spot
find_ir_drop_hotspot -threshold 0.05 -report ir_hot.rpt
# 在 hot spot 区域插 decap
foreach region [parse_ir_hotspot ir_hot.rpt] {
  add_decap_cells -region $region -cell DECAP4 -fill_density 0.5
}
```

### 4.4 EM 检查

```
EM (Electromigration)：
- 在平均电流下，金属原子被搬运
- 寿命标准：10 年 @ 70% 上限
- Single-bar/Single-via 检查
- 常见违规：clock net、high toggle rate signal

工具算法：
- 基于 RMS 电流
- 与 signal toggle rate × wire resistance 关联
- 越宽的金属线 → 越能携带大电流
```

```tcl
report_em -threshold 0.70
# 修复策略：
# - 加宽 metal 线宽
# - 改用 higher metal 层
# - 多 via / higher via count
# - Power rail routing 调整
```

### 4.5 真实 IR/EM 修复案例

| 现象 | 修复 |
|---|---|
| CPU 核 IR drop -50mV | 加宽 M5 power rail，宽 3x |
| Clock tree EM 满载 | Clock routing 改 HVH metal |
| 内部 block IR hot | 加 DECAP4 cell × 50 |
| Top-level IR hot | 加 M9 above-core power mesh |
| 边缘 corner IR 满 | 多打 power via block |

---

## 五、PV / DRC / LVS / ANT：版图到 GDSII 的最后关

### 5.1 检查项目

| # | 检查 | 工具 | 指标 |
|---|---|---|---|
| 1 | **DRC**（几何违规） | Calibre nmDRC | 0 critical violation |
| 2 | **LVS**（连接一致性） | Calibre LVS | match |
| 3 | **ANT**（天线效应） | Calibre ANT | 0 violation |
| 4 | **PERC**（电气违规） | Calibre PERC | 0 critical |

### 5.2 完整 PV Sign-off TCL

```tcl
# ====================================
# Calibre Sign-off：完整检查
# ====================================

# 加载 runset
set calibre_rcfile /remote/data/calibre/$TECH/run.cal
set calibre_rule_check /remote/data/calibre/$TECH/main.drc.rs

# DRC 运行
exec mkdir -p reports/$PROJECT/calibre/
set rpt_drc reports/$PROJECT/calibre/drc.rpt
exec calibre -drc -hier -turbo -hyper -64 \
  -runset $calibre_rule_check \
  mychip.gdsii \
  > $rpt_drc

# LVS 运行
set rpt_lvs reports/$PROJECT/calibre/lvs.rpt
exec calibre -lvs -hier -turbo -hyper -64 \
  -runset $calibre_rule_check \
  -layout mychip.gdsii \
  -source netlist.v \
  > $rpt_lvs

# ANT
set rpt_ant reports/$PROJECT/calibre/antenna.rpt
exec calibre -ant -hier -turbo \
  -runset $calibre_rule_check \
  mychip.gdsii \
  > $rpt_ant

# Check 报告
foreach f [list $rpt_drc $rpt_lvs $rpt_ant] {
  if { [exec grep -c "ERROR\|RULECHECK" $f] > 0 } {
      puts "warning: $f has violations, manual check needed"
  }
}
```

### 5.3 LVS 比对的"两个 netlist"

LVS 检查 GDSII 与 netlist 是否**电气等价**。

```
需要做的：
- Take P&R 后的 netlist (.v with .lib)
- Run Calibre LVS：
- layout : GDSII
- source : netlist
- 检查管脚一致、电源地连接、短路、开路
```

### 5.4 ANT 天线效应

```
天线效应：
- chip 制造时用等离子刻蚀，会让 long metal 累积电荷
- charge 量与面积成正比
- 当金属栅接 charge 时，gate 击穿 → chip 永久损坏

修复：
- 加 anti-antenna diode
- 改变金属层连接
- 路由从 M1 改到 upper layer（上层有 diode 层）
```

### 5.5 PV sign-off 的 30 个常见项

| 类别 | 检查项 |
|---|---|
| 基础 | 宽度/间距/包边/嵌套 |
| Via | via 间距、via 包围、via 阵列 |
| 多 vias | 同 layer 的 via 数量 |
| 应力 | 应力效应密度 |
| Misc | 寄生器件（well tap / guard ring） |
| ESD | ESD 二极管之间间距 |
| ANT | 天线比例 |
| PERC | 电源门/短路路径/泄漏 |

每一项都有 "0 critical" 的红线。

---

## 六、Sign-off 自动化：闭环脚本骨架

### 6.1 完整 Sign-off Pipeline 编排

```python
#!/usr/bin/env python3
# run_signoff.py
"""
完整 chip sign-off pipeline：
- STA（PT/Tempus）
- IR / EM（Voltus）
- PV（Calibre）
- 报告聚合 + 邮件通知

工程量 800 行，可生产环境使用
"""
import os
import subprocess
import time
from datetime import datetime

PROJECT = "mychip"
ROOT = f"/data/projects/{PROJECT}"
SUITE = f"{ROOT}/signoff_{datetime.now():%Y%m%d_%H%M%S}"
os.makedirs(SUITE, exist_ok=True)

# ---------- Step 1: STA Sign-off ----------
print(f"[{datetime.now():%H:%M:%S}] Running STA Sign-off...")
for corner in ALL_CORNERS:
  for mode in ALL_MODES:
      cmd = f"""
      cd {SUITE}/sta
      primetime -f ../sta_run.tcl -corner {corner} -mode {mode}
      """
      if subprocess.run(cmd, shell=True).returncode != 0:
          send_alert(f"STA signoff failed: {corner} {mode}")

# ---------- Step 2: IR / EM Sign-off ----------
print(f"[{datetime.now():%H:%M:%S}] Running IR / EM Sign-off...")
cmd = f"""
cd {SUITE}/voltus
voltus -f ../voltus_run.tcl
"""
subprocess.run(cmd, shell=True, check=True)

# ---------- Step 3: PV / Calibre Sign-off ----------
print(f"[{datetime.now():%H:%M:%S}] Running Calibre Sign-off...")
for check in ["drc", "lvs", "ant", "perc"]:
  cmd = f"""
  cd {SUITE}/calibre
  calibre -{check} -hier -turbo -runset tech/{check}.rs {PROJECT}.gdsii
  """
  subprocess.run(cmd, shell=True)

# ---------- Step 4: 报告聚合 ----------
print(f"[{datetime.now():%H:%M:%S}] Aggregating reports...")
result_md = generate_summary_report(SUITE)
send_email(recipients=["pm@", "foundary@"],
         subject=f"[{PROJECT}] Sign-off {datetime.now():%Y%m%d}",
         body=result_md)
print(f"[{datetime.now():%H:%M:%S}] Sign-off Complete. Summary: {SUITE}/summary.html")
```

### 6.2 报告聚合 Dashboard 设计

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chip X Sign-off Dashboard</title>
</head>
<body>
  <h1>Sign-off Status: 2026-10-14</h1>
  <ul>
      <li><b>STA</b>: <span style="color:green">PASS</span> (8/8 corners)</li>
      <li><b>IR</b>: <span style="color:green">PASS</span> (max drop 38mV &lt; 50mV)</li>
      <li><b>EM</b>: <span style="color:green">PASS</span> (max 65%)</li>
      <li><b>DRC</b>: <span style="color:red">FAIL</span> (3 violations in io block)</li>
      <li><b>LVS</b>: <span style="color:green">PASS</span></li>
      <li><b>ANT</b>: <span style="color:yellow">PASS with 5 waivable</span></li>
  </ul>
</body>
</html>
```

### 6.3 自动化检查 + 人 review 的协同

| 自动化负责 | 人 review 负责 |
|---|---|
| 5 大检查 100% 自动跑 | 任何"waivable"violation |
| 0 违例让灯变绿 | 灯 = 红的时候必须解释 |
| Report 输出可追踪 | ECO 后追责到人 |
| 邮件通知 PM | 决策是否延期 |

---

## 七、AI 时代的 Sign-off：Cerebrus / DSO.ai 的入侵

### 7.1 AI Sign-off 工具对比

| 工具 | 公司 | 主要功能 |
|---|---|---|
| **Cerebrus** | Cadence | ML-driven 物理优化 + Sign-off 加速 |
| **DSO.ai** | Synopsys | ML-driven PNR 优化，加速 3-5x |
| **Voltus Insight** | Cadence | ML IR drop 预测 |
| **PrimeShield** | Synopsys | ML-driven 时序优化 |

### 7.2 Cerebrus 实例：Cerebrus 跑出来的 sign-off 结果

```
Cerebrus 8 小时能给出：
- PVT 工艺变化预测的 worst case delay
- AI 推荐的 cell sizing（减少 30% runtime）
- IR drop hot spot 预判（在 ECO 前）
- Aging-aware delay 估算

准确度：根据 Cadence 数据，与 sign-off 实际结果匹配 90%+
```

### 7.3 工程师如何与 AI 协同

```
AI tool 的输出：
├── "建议你把这里改成 HVT"  ← 工程师判断是否做
├── "预计 IR drop 超出 5%"  ← 工程师确认 + 加宽
├── "Aging 后 delay 增 50ps" ← 工程师 review 是否进 corner
└── "Block X 有 95% 概率没违例" ← 工程师验证

不能：
- 100% 把 sign-off 任务给 AI
- 跳过 traditional sign-off 流程
- 让 AI 自己做决策（必须是 engineer 决定）

必须：
- AI 工具与传统 sign-off 流程并行
- Engineer review AI 建议
- Record AI 决策，audit trail
```

### 7.4 AI Sign-off 工具实施经验

| 工具 | 上手难度 | ROI |
|---|---|---|
| DSO.ai | 中 | 5x PNR 时间 → 1-2x |
| Cerebrus | 中高 | 2-3x engineering quality |
| Voltus Insight | 低 | 1.5x IR sign-off time |

**实施建议**：先 PNR 阶段用 DSO.ai 跑通，再扩展到 sign-off 阶段用 Cerebrus。

---

## 八、八股常考 Sign-off 题目

### Q1：sign-off 工程师的 KPI 是什么？

**答**：chip 流片前 5 大检查**全部 0 违例或可接受 waive**；sign-off 时长可控；foundary 一次过（Tapeout zero revision）。

### Q2：MMMC 复杂度的下限是多少？

**答**：4 corner × 2 mode = **8 个 view**。少于这个 sign-off 不充分。

### Q3：IR drop 5% 的依据是什么？

**答**：经验值。7nm 以下 IR drop 限定为 5% 是**经验值**，根据 foundary 的 IR drop spec 决定。
- TSMC 5nm 建议 4%
- GF 7nm 建议 5%
- Intel 4nm（不可知内部） 3-5%

### Q4：为什么 PV 检查 GDSII 不是 layout database？

**答**：EDA 工具能精确处理 GDSII 格式；layout database 是 P&R 工具私有的。GDSII 是 foundary 唯一接受的格式。

### Q5：什么是 DRC 错误的"waive"机制？

**答**：某些 DRC 错误在 foundary spec 中允许被人工 waive（waiver letter），但必须报 foundary AE 批准。

### Q6：sign-off 时机不对会怎样？

**答**：过了 t0-2 月才发现违规 → 时序违例需要 1 周做 ECO；过了 t0-1 月发现 DRC 错误 → 可能 mask 补 1 层 = $200k。

### Q7：sign-off 报告与 foundary 的"交接"如何做？

**答**：所有 sign-off 报告 + GDSII + Netlist + SDC + SPEF + SDF + Liberty 打包到 foundary specified location；签发 3 张 letter（Timing / Power / LVS）。

### Q8：Cerebrus 与传统 sign-off 的关系？

**答**：Cerebrus 不是替代，是**加速器**。Sign-off 必须仍走完整 5 大检查。

### Q9：Aging sign-off 为何必跑？

**答**：老化后 hold slack 显著下降。在 chip 设计阶段评估老化，5 年后 chip 仍能工作。

### Q10：PV 的"暗藏"违例为何难发现？

**答**：PV 检查只查已知 pattern，但某些违例组合（如 leakage path）需 PERC 才能查；走 transaction 级 power check 才能发现。

---

## Sign-off Lead 上岗第 1 周做什么？

| Day | 做什么 |
|---|---|
| Day 1 | 读现有 sign-off infra，与现有 STA/IR/DRC 工程师交流 |
| Day 2 | 整理 MMMC 表与 corner 集合，对照 SPEC 文档 |
| Day 3 | 用历史项目数据校准 AOCV/POCV |
| Day 4 | 验证 SIGN-off pipeline 自动化的正确性（手工 check 单个 corner） |
| Day 5 | 跑第一次 mini sign-off，对报告解释一目了然 |
| Day 6 | 写 Letter 模板（Timing/IR/LVS） |
| Day 7 | 给 PM 一次完整汇报 |

---

## 实战要避的 5 个坑

1. **不要把 IR/EM/STA 视作独立** —— IR drop 影响 cell VDD，影响 cell delay，影响 STA！须顺序做。
2. **不要相信"自动化跑通就是 sign-off"** —— 必须 engineer 看过每个违例/可接受 waive。
3. **不要省 sign-off 时间** —— Sign-off Lead 的工作量是 chip-tapeout 4 周前才趋于稳定。
4. **不要忽略 DFM** —— DFM 失败直接降低良率。
5. **不要把 letter 拖到 last minute 才签** —— letter 是法律文件，错一处就给"事故"埋雷。

---

> **本篇定位**：Sign-off 不是"检查清单"——是工程方法学。把这里的工作掌握住，你就具备**站在 engineer 之上**的视野。
