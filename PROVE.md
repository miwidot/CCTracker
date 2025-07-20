# PROVE.md - Claude CLI Data Analysis Commands

This document contains terminal commands to analyze and verify Claude CLI usage data for the CCTracker application.

## Data Range Analysis

### Find Earliest Usage Data
```bash
find /Users/miwi/.claude/projects -name "*.jsonl" -print0 | xargs -0 grep '"type":"assistant"' | grep -o '"timestamp":"[^"]*"' | sed 's/"timestamp":"//g' | sed 's/"//g' | sort | head -1
```
**Result**: `2025-06-21T04:22:25.407Z`

### Find Latest Usage Data
```bash
find /Users/miwi/.claude/projects -name "*.jsonl" -print0 | xargs -0 grep '"type":"assistant"' | grep -o '"timestamp":"[^"]*"' | sed 's/"timestamp":"//g' | sed 's/"//g' | sort | tail -1
```
**Result**: `2025-06-27T10:04:13.391Z`

### Calculate Total Tracking Days
```bash
python3 -c "
from datetime import datetime
start = datetime.fromisoformat('2025-06-21T04:22:25.407Z'.replace('Z', '+00:00'))
end = datetime.fromisoformat('2025-06-27T10:04:13.391Z'.replace('Z', '+00:00'))
days = (end - start).days
print(f'Total tracking period: {days} days')
print(f'From: {start.strftime(\"%Y-%m-%d %H:%M:%S UTC\")}')
print(f'To:   {end.strftime(\"%Y-%m-%d %H:%M:%S UTC\")}')
"
```
**Result**: 
```
Total tracking period: 6 days
From: 2025-06-21 04:22:25 UTC
To:   2025-06-27 10:04:13 UTC
```

## Usage Statistics

### Count Total Assistant Messages
```bash
find /Users/miwi/.claude/projects -name "*.jsonl" -print0 | xargs -0 grep -c '"type":"assistant"'
```

### Count Files with Usage Data
```bash
find /Users/miwi/.claude/projects -name "*.jsonl" -exec grep -l '"type":"assistant"' {} \; | wc -l
```

### List Projects with Usage Data
```bash
find /Users/miwi/.claude/projects -name "*.jsonl" -exec grep -l '"type":"assistant"' {} \; | sed 's|/[^/]*\.jsonl||' | sort -u
```

## Data Validation

### Verify JSONL File Structure
```bash
# Check if files contain valid JSON
find /Users/miwi/.claude/projects -name "*.jsonl" | head -5 | xargs -I {} sh -c 'echo "=== {} ==="; head -2 "{}" | jq . || echo "Invalid JSON"'
```

### Check Model Distribution
```bash
find /Users/miwi/.claude/projects -name "*.jsonl" -print0 | xargs -0 grep '"type":"assistant"' | grep -o '"model":"[^"]*"' | sort | uniq -c | sort -nr
```

### Find Synthetic/Test Entries
```bash
find /Users/miwi/.claude/projects -name "*.jsonl" -print0 | xargs -0 grep '"model":"<synthetic>"' | wc -l
```

## Date Range Queries

### Get Usage Data for Specific Date
```bash
# Example: Get data for June 27, 2025
find /Users/miwi/.claude/projects -name "*.jsonl" -print0 | xargs -0 grep '"type":"assistant"' | grep '"timestamp":"2025-06-27' | wc -l
```

### Get Usage Data for Last N Days
```bash
# Get data from last 3 days
python3 -c "
from datetime import datetime, timedelta
import subprocess
import json

end_date = datetime.now()
start_date = end_date - timedelta(days=3)
start_str = start_date.strftime('%Y-%m-%d')

cmd = f'find /Users/miwi/.claude/projects -name \"*.jsonl\" -print0 | xargs -0 grep \"\\\"type\\\":\\\"assistant\\\"\" | grep \"\\\"timestamp\\\":\\\"202[0-9]\" | grep -c \"\\\"timestamp\\\":\\\"[^\\\"]*{start_str}\"'
print(f'Assistant messages in last 3 days: (from {start_str})')
"
```

## Summary

**Current Data Range**: 6 days (June 21 - June 27, 2025)  
**Tracking Started**: 2025-06-21T04:22:25.407Z  
**Latest Data**: 2025-06-27T10:04:13.391Z  

**Benefits for CCTracker**:
- ALL button can use actual earliest date (June 21) instead of arbitrary 2020-01-01
- More efficient date filtering with 6 days instead of 5+ years
- Accurate data range representation in UI

## Notes

- Commands target `"type":"assistant"` messages as these contain usage/token data
- All timestamps are in UTC format
- JSONL files are located in `/Users/miwi/.claude/projects/`
- Each project has its own subdirectory with session-based JSONL files