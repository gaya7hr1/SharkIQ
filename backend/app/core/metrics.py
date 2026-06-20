import time
import os
import ctypes
from collections import deque, defaultdict


class MetricsCollector:
    def __init__(self):
        # Maps (method, path, status) -> count
        self.request_counts = defaultdict(int)
        # Maps (method, path) -> deque of last 1000 durations in seconds
        self.request_durations = defaultdict(lambda: deque(maxlen=1000))
        self.start_time = time.time()

    def record_request(self, method: str, path: str, status_code: int, duration: float):
        self.request_counts[(method, path, status_code)] += 1
        self.request_durations[(method, path)].append(duration)

    def get_process_memory(self) -> tuple[int, int]:
        # Returns (virtual_memory_bytes, resident_memory_bytes)
        if os.name == 'nt':
            try:
                class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
                    _fields_ = [
                        ("cb", ctypes.c_ulong),
                        ("PageFaultCount", ctypes.c_ulong),
                        ("PeakWorkingSetSize", ctypes.c_size_t),
                        ("WorkingSetSize", ctypes.c_size_t),
                        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                        ("PagefileUsage", ctypes.c_size_t),
                        ("PeakPagefileUsage", ctypes.c_size_t),
                    ]
                
                GetProcessMemoryInfo = ctypes.windll.psapi.GetProcessMemoryInfo
                GetCurrentProcess = ctypes.windll.kernel32.GetCurrentProcess
                
                GetCurrentProcess.restype = ctypes.c_void_p
                GetProcessMemoryInfo.argtypes = [ctypes.c_void_p, ctypes.POINTER(PROCESS_MEMORY_COUNTERS), ctypes.c_ulong]
                
                counters = PROCESS_MEMORY_COUNTERS()
                counters.cb = ctypes.sizeof(counters)
                if GetProcessMemoryInfo(GetCurrentProcess(), ctypes.byref(counters), counters.cb):
                    return counters.PagefileUsage, counters.WorkingSetSize
            except Exception:
                pass
            return 0, 0
        else:
            try:
                with open("/proc/self/statm", "r") as f:
                    fields = f.read().split()
                    return int(fields[0]) * 4096, int(fields[1]) * 4096
            except Exception:
                return 0, 0

    def generate_prometheus_metrics(self) -> str:
        lines = []
        
        # 1. HTTP Request Total
        lines.append("# HELP http_requests_total Total number of HTTP requests.")
        lines.append("# TYPE http_requests_total counter")
        for (method, path, status), count in self.request_counts.items():
            lines.append(f'http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')
            
        # 2. HTTP Request Duration (Quantiles: 0.5, 0.9, 0.95, 0.99)
        lines.append("# HELP http_request_duration_seconds Summary of HTTP request durations.")
        lines.append("# TYPE http_request_duration_seconds summary")
        for (method, path), durations in self.request_durations.items():
            if not durations:
                continue
            sorted_durations = sorted(durations)
            n = len(sorted_durations)
            p50 = sorted_durations[min(int(n * 0.5), n - 1)]
            p90 = sorted_durations[min(int(n * 0.9), n - 1)]
            p95 = sorted_durations[min(int(n * 0.95), n - 1)]
            p99 = sorted_durations[min(int(n * 0.99), n - 1)]
            total_sum = sum(durations)
            
            lines.append(f'http_request_duration_seconds{{quantile="0.5",method="{method}",path="{path}"}} {p50:.4f}')
            lines.append(f'http_request_duration_seconds{{quantile="0.9",method="{method}",path="{path}"}} {p90:.4f}')
            lines.append(f'http_request_duration_seconds{{quantile="0.95",method="{method}",path="{path}"}} {p95:.4f}')
            lines.append(f'http_request_duration_seconds{{quantile="0.99",method="{method}",path="{path}"}} {p99:.4f}')
            lines.append(f'http_request_duration_seconds_sum{{method="{method}",path="{path}"}} {total_sum:.4f}')
            lines.append(f'http_request_duration_seconds_count{{method="{method}",path="{path}"}} {n}')

        # 3. Process Memory
        virt_bytes, res_bytes = self.get_process_memory()
        lines.append("# HELP process_virtual_memory_bytes Virtual memory size in bytes.")
        lines.append("# TYPE process_virtual_memory_bytes gauge")
        lines.append(f"process_virtual_memory_bytes {virt_bytes}")
        
        lines.append("# HELP process_resident_memory_bytes Resident memory size in bytes.")
        lines.append("# TYPE process_resident_memory_bytes gauge")
        lines.append(f"process_resident_memory_bytes {res_bytes}")

        # 4. CPU Usage
        cpu_time = time.process_time()
        lines.append("# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.")
        lines.append("# TYPE process_cpu_seconds_total counter")
        lines.append(f"process_cpu_seconds_total {cpu_time:.4f}")

        # 5. Process Uptime
        uptime = time.time() - self.start_time
        lines.append("# HELP process_uptime_seconds Process uptime in seconds.")
        lines.append("# TYPE process_uptime_seconds gauge")
        lines.append(f"process_uptime_seconds {uptime:.2f}")

        return "\n".join(lines) + "\n"


metrics_collector = MetricsCollector()
