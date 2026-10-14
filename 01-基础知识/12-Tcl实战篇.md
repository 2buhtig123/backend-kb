# Tcl 实战：后端工程师必备的工程脚本手册

> "成为后端工程师的标志：在 EDA 工具里写得出能 production 用的 Tcl"。  
> 本篇不讲 Tcl 语法（你能 Google），讲**后端特定的 Tcl 模式**和**实战代码模板**。
>
> **目标**：复制这些 proc 到你的 TCL 文件里，**马上能省一周工作量**。
>
> **适合人群**：
> - 想摆脱手工 GUI 操作的新人
> - 想把现有 PNR 流程自动化的工程师
> - 准备做工具调优 Script 的 engineer

---

## 目录

- [一、Tcl 工程哲学：为什么所有人都用 Tcl](#一tcl-工程哲学为什么所有人都用-tcl)
- [二、5 个必备 proc 模板（立刻提升生产力）](#二5-个必备-proc-模板立刻提升生产力)
- [三、Innovus 自动化流程骨架](#三innovus-自动化流程骨架)
- [四、PrimeTime 实战脚本](#四primetime-实战脚本)
- [五、Tcl 与 Perl / Python 集成](#五tcl-与-perl--python-集成)
- [六、错误处理与 log 系统](#六错误处理与-log-系统)
- [七、Tcl 调试技巧](#七tcl-调试技巧)
- [八、八股常考 Tcl 题目](#八八股常考-tcl-题目)

---

## 一、Tcl 工程的哲学：为什么所有人都用 Tcl

### 1.1 EDA 工具为何用 Tcl

| 工具 | 入口 | 扩展点 |
|---|---|---|
| Innovus | `innovus` | `set_db`、`optDesign`、`gui_*` |
| Genus | `genus` | `elaborate`、`syn_generic`、`syn_map` |
| PrimeTime | `primetime` | `report_timing`、`set_timing_derate` |
| Calibre | `calibre` | `DRC`、`LVS`、`PEX` |
| Voltus | `voltus` | `analyze_ir_drop` |

**结论**：所有主流 EDA 工具都用 Tcl = **一个工具学会，跨工具使用**。

### 1.2 Tcl vs 其他语言的选择

| 场景 | 用 |
|---|---|
| EDA 流程自动化 | **Tcl** （必） |
| 大量数据分析 (SPEF/Verilog 解析) | **Python** |
| 文本批量处理 (batch file edit) | **Perl** |
| 数据库 | **Shell + SQL** |
| GUI | 工具自带 + 单独 C++ |

**Tcl 强在哪**：与 EDA 工具深度集成（所有 tool 内 command 都是 Tcl 形式）；proc 抽象；变量快速读修。

### 1.3 Tcl 的"后端工程师三大痛点"

```
1. proc 调用 vs 内置命令搞不清：
   info procs  ← 看所有的 proc
   info commands  ← 看所有的 command (包括 tool 内置)

2. 全局变量 vs local variable：
   set x 1 ;# global
   proc foo {} { set x 2 ;# local, 不影响全局 }
   要改全局：global x ; set x 2

3. 嵌套 namespace：
   namespace eval company::module {
       proc my_proc {} { }
   }
   调用：company::module::my_proc
```

---

## 二、5 个必备 proc 模板（立刻提升生产力）

### 2.1 proc#1：info 打印函数

```tcl
proc print_info {msg} {
    set time_stamp [clock format [clock seconds] -format "%Y-%m-%d %H:%M:%S"]
    puts "INFO  \[$time_stamp\] $msg"
    flush stdout
}
proc print_warn {msg} {
    set time_stamp [clock format [clock seconds] -format "%Y-%m-%d %H:%M:%S"]
    puts "WARN  \[$time_stamp\] $msg"
    flush stdout
}
proc print_error {msg} {
    set time_stamp [clock format [clock seconds] -format "%Y-%m-%d %H:%M:%S"]
    puts "ERROR \[$time_stamp\] $msg"
    flush stdout
}

# 用法
print_info "Starting PNR step 1: floorplan"
print_error "Cannot find timing constraint file"
```

### 2.2 proc#2：path 检查（无路径自建）

```tcl
proc ensure_path {path} {
    if {![file exists $path]} {
        file mkdir $path
        print_info "Created path: $path"
    }
}

# 用法：自动建 reports/corner/wc_setup/
ensure_path [file join reports $corner wc_setup]
```

### 2.3 proc#3：批次处理（最重要）

```tcl
# 加载 design 的通用方法
proc load_design_library {top_lib_path} {
    set_db lib_search_path $top_lib_path
    set_db library {*}[lsort [glob -nocomplain "$top_lib_path/**/*.lib"]]
    set_db lef_library {*}[lsort [glob -nocomplain "$top_lib_path/**/*.lef"]]
    set_db qrc_tech_file [glob -nocomplain "$top_lib_path/**/*.qrc"]
    set_db cap_table_file [glob -nocomplain "$top_lib_path/**/*.captbl"]]
}

# 通用 load_netlist
proc load_netlist {top_netlist top_sdc top_spef} {
    set_db init_design_uniquify true
    set_db init_top_cell [file rootname [file tail $top_netlist]]
    read_netlist $top_netlist
    init_design
    read_sdc $top_sdc
    read_spef $top_spef
}

# 通用 report save
proc save_reports {prefix obj_list args} {
    foreach_check {rpt_name rpt_type rpt_args} $args {
        if {[catch {
            redirect -append reports/${prefix}.${rpt_name} { 
                $rpt_type {*}$rpt_args 
            }
        } err]} {
            print_warn "Could not save report $rpt_name: $err"
        }
    }
}
```

### 2.4 proc#4：try/catch 全包裹

```tcl
proc safe_run {cmd_name script} {
    print_info "Running $cmd_name..."
    if {[catch {uplevel 1 $script} result options]} {
        print_error "$cmd_name failed: $result"
        print_error "Options: $options"
        return -1
    } else {
        print_info "$cmd_name completed"
        return $result
    }
}

# 用法
safe_run "Floorplan" { initialize_floorplan ... }
safe_run "Place"     { place_opt_design }
safe_run "CTS"       { clock_opt ... }
```

### 2.5 proc#5：cell 探针（debug 模式）

```tcl
proc probe_cell {cell_path} {
    set cell [get_cells $cell_path]
    if {![sizeof_collection $cell]} {
        print_warn "Cell $cell_path not found"
        return
    }
    foreach_in_collection c $cell {
        print_info "=== Probe $c ==="
        puts "  Reference:  [get_property $c ref_name]"
        puts "  Size:       [get_property $c size]"
        puts "  Status:     [get_property $c status]"
        foreach_in_collection p [get_pins -of $c] {
            puts "  Pin $p: dir=[get_property $p direction]"
        }
    }
}

# 用法：probe debug_block/U0/U_inner_reg
probe_cell "debug_block/U0/U_inner_reg"
```

---

## 三、Innovus 自动化流程骨架

### 3.1 完整 PNR 流程骨架

```tcl
# ====================================
# 完整 Innovus PNR Flow
# ====================================

# ---------- 1. 工程初始化 ----------
proc init_project {project_name root} {
    global env
    ensure_path ${root}/outputs/${project_name}
    set_db program_name $project_name
    set_db init_design_scaffold ${root}/inputs/design.scaffold.v
    print_info "Init project: $project_name"
}

# ---------- 2. Floorplan ----------
proc do_floorplan { } {
    source scripts/floorplan.tcl
    print_info "Floorplan done"
}

# ---------- 3. Placement ----------
proc do_placement { } {
    set_db place_opt_initial_place true
    set_db place_opt_final_place true
    place_opt_design -prefix place
    print_info "Placement done"
}

# ---------- 4. CTS ----------
proc do_cts { } {
    set_db cts_target_skew 0.05
    clock_opt -prefix cts
    print_info "CTS done"
}

# ---------- 5. Routing ----------
proc do_routing { } {
    set_db route_opt_detail_active_via_res 1.0
    route_opt -prefix route
    print_info "Routing done"
}

# ---------- 6. Optimization ----------
proc do_opt { } {
    opt_design -prefix opt
    print_info "Optimization done"
}

# ---------- 7. Reports ----------
proc generate_reports { } {
    redirect reports/summary.rpt {
        puts "==== Summary Report ===="
        puts "Total cells: [sizeof_collection [get_cells *]]"
        puts "Total nets: [sizeof_collection [get_nets *]]"
        puts "Total delay: [get_property [current_design] total_delay]"
        report_design -summary
    }
}

# ---------- Main flow ----------
proc run_pnr_flow { } {
    set start_time [clock seconds]

    safe_run "1. Floorplan"  {do_floorplan}
    safe_run "2. Placement"  {do_placement}
    safe_run "3. CTS"        {do_cts}
    safe_run "4. Routing"    {do_routing}
    safe_run "5. Optimization" {do_opt}
    safe_run "6. Reports" {generate_reports}

    set end_time [clock seconds]
    print_info "Total PNR time: [expr {$end_time - $start_time}] seconds"
}

# ---------- 主入口 ----------
run_pnr_flow
```

### 3.2 Corner 调度器

```tcl
# ====================================
# Corner 调度器：一键跑全部 corner
# ====================================

set ALL_CORNERS {{wc_setup ss_0p88_125c} {bc_hold ff_0p95_-40c} {wc_setup_lowV ss_0p88_125c_lowV} {bc_hold_lowV ff_0p83_-40c}}

proc run_pnr_all_corners { } {
    global ALL_CORNERS
    foreach corner $ALL_CORNERS {
        set corner_name [lindex $corner 0]
        set pvt [lindex $corner 1]
        set_analysis_view -setup $corner_name -hold $corner_name
        update_timing -full
        redirect reports/PNR_${corner_name}.rpt { report_timing -delay max -max_paths 1000 }
        redirect reports/PNR_${corner_name}_hold.rpt { report_timing -delay min -max_paths 1000 }
    }
}

# 用 run_pnr_all_corners 一次跑全 corner
```

### 3.3 Live ECO 处理

```tcl
# ====================================
# Live ECO：从 form 加载修改 netlist，应用 fix
# ====================================

proc do_live_eco {eco_netlist} {
    safe_run "Load ECO netlist" {
        read_netlist $eco_netlist -eco
    }
    safe_run "ecoPlace"  { ecoPlace }
    safe_run "ecoRoute" { ecoRoute }
    safe_run "ecoOpt" {
        setOptMode -fixDesign true
        optDesign -preCTS
    }
    safe_run "Update Timing" {
        update_timing -full
    }
    print_info "ECO complete"
}

# 用法：do_live_eco ./inputs/eco_netlist.v
```

---

## 四、PrimeTime 实战脚本

### 4.1 完整 PT 流程

```tcl
# ====================================
# PrimeTime 完整 sign-off flow
# ====================================

set top_design "my_chip"
set top_netlist "./netlist/${top_design}.v"
set top_sdc "./sdc/func.sdc"
set top_libs (list of all .lib files)
set top_spef "./spef/${top_design}.spef"

# ---------- 1. 加载 ----------
puts "INFO \[PT\] Loading design"
set_app_options -name time.enable_aocv -value true
set_app_options -name time.enable_si -value true
set_app_options -name time.cppr_enable -value both

set init_top_cell $top_design
set init_verilog  $top_netlist
set init_lib_path [join $top_libs " "]
init_design -top $top_design

# ---------- 2. 加载时序约束 ----------
source -echo $top_sdc

# ---------- 3. 反标 ----------
read_parasitics $top_spef

# ---------- 4. 跑特定 corner ----------
set_analysis_mode -aocv true
set_analysis_view -setup func_wc -hold func_bc

update_timing -full

# ---------- 5. 报告 ----------
proc generate_timing_reports { } {
    set corner_name [get_app_options time.current_view]
    redirect reports/setup_${corner_name}.rpt { 
        report_timing -delay max -path full -max_paths 1000 -sort_by group 
    }
    redirect reports/hold_${corner_name}.rpt {
        report_timing -delay min -path full -max_paths 1000 -sort_by group
    }
    redirect reports/min_pulse_${corner_name}.rpt {
        report_analysis_coverage -check_type min_pulse_width
    }
    redirect reports/noise_${corner_name}.rpt {
        report_noise -above -below -hier
    }
}

proc run_all_corners { } {
    set corners {func_wc func_bc scan_wc scan_bc}
    foreach corner $corners {
        set_analysis_view -setup ${corner} -hold ${corner}
        update_timing -full
        generate_timing_reports
    }
}

run_all_corners
```

### 4.2 PT 八股高频 proc

```tcl
# 找最差的 10 条路径
proc show_worst_path {n} {
    report_timing -delay max -max_paths $n -sort_by slack
}

# 调试 path
proc debug_path {endpoint} {
    set pin [get_pins $endpoint]
    if {![sizeof_collection $pin]} {
        print_warn "No path endpoint $endpoint"
        return
    }
    report_timing -from [all_fanin -flat -startpoints_only -to $pin] -to $pin -path full
}

# 检查未约束路径
proc check_unconstrained {} {
    set all_eps [all_registers -as_endpoint]
    set unconstrained_endpoints {}
    foreach_in_collection pin $all_eps {
        if {[get_attribute $pin status] eq "unconstrained"} {
            lappend unconstrained_endpoints [get_object_name $pin]
        }
    }
    return $unconstrained_endpoints
}

# 看跨时钟域路径
proc show_cdc_paths {} {
    foreach_in_collection clkA [get_clocks *] {
        foreach_in_collection clkB [get_clocks *] {
            if {$clkA != $clkB} {
                set paths [filter_collection [all_timing_paths -from $clkA -to $clkB] {established_slnk >= -10}]
                print_info "CDC $(get_object_name $clkA) -> $(get_object_name $clkB): [sizeof_collection $paths] tight paths"
            }
        }
    }
}
```

---

## 五、Tcl 与 Perl / Python 集成

### 5.1 Perl 与 Tcl 互换数据

```tcl
# Tcl → Perl：调用 perl 解析 complex text
proc parse_verilog_with_perl {file} {
    set result [exec perl -e "
        use strict;
        use File::Find;
        my \$module;
        open my \$f, '<', '$file' or die;
        while (<\$f>) {
            if (/module\s+(\w+)/) { \$module = \$1; }
        }
        close \$f;
        print \$module;
    "]
    return $result
}

# Perl → Tcl：传参给 perl
proc grep_in_files {pattern path} {
    set result [exec grep -rl "$pattern" $path]
    return [split $result "\n"]
}
```

### 5.2 Python 解析 SPEF

```python
# scripts/parse_spef.py
#!/usr/bin/env python3
import sys
import re

def parse_spef(filename):
    """Simple SPEF parser: count nets + RC"""
    with open(filename) as f:
        content = f.read()
    nets = re.findall(r'\*(\d+\s+\S+)', content)
    resistors = re.findall(r'\*R\d+', content)
    caps = re.findall(r'\*C\d+', content)
    print(f"Nets: {len(nets)}, Resistors: {len(resistors)}, Caps: {len(caps)}")

if __name__ == "__main__":
    parse_spef(sys.argv[1])
```

```tcl
# Tcl 调 python
proc analyze_spef {spef_file} {
    exec python3 scripts/parse_spef.py $spef_file
}

# 用法
analyze_spef ./spef/chip.spef
```

### 5.3 Tcl 与 JSON 数据交换

```tcl
# 解析 JSON
package require json
proc parse_project_config {json_file} {
    set fp [open $json_file r]
    set json [read $fp]
    close $fp
    set config [json::json2dict $json]
    return $config
}

# 写 JSON
proc save_project_status {status_dict {file "status.json"}} {
    package require json
    set json_str [json::dict2json $status_dict]
    set fp [open $file w]
    puts $fp $json_str
    close $fp
}
```

### 5.4 通过文件传递数据

```tcl
# 当 proc 复杂 / EDA tool 无法直接处理，用文件中间传递
proc dump_to_csv {data_out file csv_data} {
    set fp [open $file w]
    foreach row $csv_data {
        puts $fp $row
    }
    close $fp
}

# 真实场景：处理 STA 结果
proc export_timing_csv {file} {
    set fp [open $file w]
    puts $fp "endpoint,slack,delay,corner"
    foreach_in_collection path [get_timing_paths] {
        set ep [get_object_name [get_attribute $path endpoint]]
        set sl [get_attribute $path slack]
        set de [get_attribute $path delay]
        puts $fp "$ep,$sl,$de,func_wc"
    }
    close $fp
}
```

---

## 六、错误处理与 log 系统

### 6.1 完整 log 系统

```tcl
# 全局 log 配置
set LOG_LEVEL {INFO}
set LOG_FILE_PATH "./logs/run.log"

proc log_write {level msg} {
    global LOG_LEVEL LOG_FILE_PATH
    set levels {DEBUG INFO WARN ERROR}
    set num_level [lsearch $levels $level]
    set num_threshold [lsearch $levels $LOG_LEVEL]
    if {$num_level < $num_threshold} return

    set ts [clock format [clock seconds] -format "%Y-%m-%d %H:%M:%S"]
    set line "[$ts] [$level] $msg"

    puts stdout $line
    set fp [open $LOG_FILE_PATH a]
    puts $fp $line
    close $fp
}

proc log_debug {msg} { log_write DEBUG $msg }
proc log_info  {msg} { log_write INFO  $msg }
proc log_warn  {msg} { log_write WARN  $msg }
proc log_error {msg} { log_write ERROR $msg }
```

### 6.2 check list 在脚本中

```tcl
proc run_pre_check { } {
    # 检查必备文件
    set required_files {./netlist.v ./sdc/func.sdc ./lib/stdcell.lib}
    foreach f $required_files {
        if {![file exists $f]} {
            log_error "Required file missing: $f"
            return -1
        }
    }
    log_info "Pre-check passed"
    return 0
}

proc main { } {
    if {[run_pre_check] != 0} {
        log_error "Pre-check failed, abort"
        exit 1
    }
    log_info "Starting main flow"
    safe_run "PNR Step 1" { step_one }
}
```

### 6.3 重试机制

```tcl
proc with_retry {cmd_name proc_call max_retry} {
    for {set i 0} {$i < $max_retry} {incr i} {
        log_info "Retry $i: $cmd_name"
        if {[catch {uplevel 1 $proc_call} result]} {
            log_warn "$cmd_name failed: $result"
            after 5000
        } else {
            log_info "$cmd_name success"
            return $result
        }
    }
    log_error "$cmd_name failed after $max_retry retries"
    return -1
}

# 用法：license 失效时重试
with_retry "Floorplan" do_floorplan 3
```

---

## 七、Tcl 调试技巧

### 7.1 必备 debug 工具

```tcl
# 1. puts 打印
puts "DEBUG: value = $value"

# 2. timestep 看哪条命令慢
set t0 [clock clicks -milliseconds]
do_something
set t1 [clock clicks -milliseconds]
puts "do_something took [expr ($t1 - $t0)] ms"

# 3. trace - 看变量何时被改
trace add variable ::global_var write {log "DEBUG [info level 0]"}

# 4. debug 1
puts "DEBUG: [info level] [info procs]"
```

### 7.2 常见 Tcl 错误 + 修复

```
错误 1：Can't find command
→ 拼写错 / 工具未加载 / package require 忘了

错误 2：can't unset "x": no such variable
→ 变量不存在，加 if {[info exists x]} { unset x }

错误 3：invoked from within "proc"
→ 递归无限 / namespace 错
→ 加 namespace eval { proc ... }

错误 4：expected integer but got ""
→ 取 list index 时空 list
→ 用 set item [lindex $list 0]; if {$item ne ""} {...}
```

### 7.3 IDE 与 Lint

```bash
# 用 Nagelfar / tclint 检查 TCL 代码
pip install tclint
tclint scripts/flow.tcl
```

### 7.4 性能优化

```
Tcl 性能 tip：
1. 避免在 hot loop 里 exec（打开子进程）
2. 用 [dict] 替代多次 [lsearch]
3. 用 namespace 包 proc 避免命名冲突
4. 用 [regexp -inline] 替代多次 regexp match
5. 大文件用 fileevent / fcopy，避免 read 全部
```

---

## 八、八股常考 Tcl 题目

### Q1：Tcl 中的 list 操作有哪些？

**答**：
- `lindex $list 0`  ← 取 index
- `llength $list`  ← 长度
- `lappend x 5`  ← append
- `lsort $list`  ← sort
- `lsearch $list pattern`  ← 搜索
- `split/join`  ← 与 string 互相转换
- `dict` 系统  ← key-value

### Q2：Tcl 如何处理 missing command / runtime error？

**答**：`catch {cmd} result` —— 错误不会中断流程。`if {[catch {...}]}` 是工程必备。

### Q3：proc 的命名空间怎么写？

**答**：
```tcl
namespace eval company::pnr_flow {
    proc do_pnr {} { }
}
company::pnr_flow::do_pnr
```

### Q4：Tcl 与 EDA 工具怎么集成？

**答**：Tcl 写到 .tcl 文件，用 `innovus -f script.tcl` 启动。直接传 -tclsh 也可。

### Q5：`uplevel` 和 `upvar` 区别？

**答**：
- `uplevel 1 $code`：在上一级 scope 执行 code
- `upvar 1 var local`：把上级的 var 引用到本地

### Q6：Tcl 中怎么并行运行？

**答**：通过 exec 启动多个进程；线程（thread 包）。

### Q7：flow.tcl 和 proc 怎么组织？

**答**：用 `source` 加载其它 .tcl：
```tcl
source scripts/utils.tcl
source scripts/floorplan.tcl
source scripts/placement.tcl
```

### Q8：如何在 flow 中传递参数？

**答**：用全局变量 / namespace 变量：
```tcl
namespace eval company::config {
    variable TOP_DESIGN "my_chip"
    variable CORNERS {{wc_setup ...} {...}}
}
```

### Q9：怎么写可重用的 proc？

**答**：用 args / 默认值：
```tcl
proc do_step {step_name {args} {}} {
    default_opts "-max_paths 1000"
    ...
}
```

### Q10：error vs return -code

**答**：
- `return -code 1`  ← 中断 pro，调用者收到错误
- `error "msg"`  ← 抛 error
- `break` / `continue`  ← 循环控制
- `exit 0`  ← 终止脚本

---

## 🎯 后端工程师 Tcl 工具箱（必备清单）

```
utils.tcl 必带 8 个 proc：
├── print_info / print_warn / print_error  ← log
├── ensure_path                           ← 自动建目录
├── safe_run                              ← try/catch
├── load_netlist / load_libs              ← 工程 load
├── probe_cell / debug_path               ← debug
├── export_csv                            ← 跨语言互操作
└── with_retry                            ← 重试机制

各自 PNR flow 文件：
├── run_pnr.tcl         ← 主入口
├── floorplan.tcl       ← init
├── placement.tcl       ← place_opt
├── cts.tcl             ← clock_opt
├── routing.tcl         ← route_opt
└── reports.tcl         ← generate all reports
```

---

## ⚠️ 实战要避的 5 个坑

1. **不要把所有逻辑都放一个 proc** —— 拆小 + source 装载
2. **不要忽略 catch 的 result 变量** —— 它有错误码和 message
3. **不要在脚本里 hardcode 路径** —— 用全局变量或环境变量
4. **不要忘记 log 写到 log 文件** —— stdout 只在交互模式才能看
5. **不要相信 `set x [get_xxx]` 拿到唯一对象** —— 可能是 collection，要 foreach

---

> **本篇定位**：Tcl 不是"会写就行"——是"写得好看、可维护、能 coverage 100% 重用"。这些 proc 模板直接抄走，把后端脚本库升级一个 level。
