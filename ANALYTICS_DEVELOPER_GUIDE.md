# Analytics Components - Developer Reference

## Quick Start Guide

### Importing Components

```typescript
import { InteractiveLineChart } from "@/components/charts/InteractiveLineChart";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { InteractiveGaugeChart } from "@/components/charts/InteractiveGaugeChart";
import { AnalyticsModal } from "@/components/charts/AnalyticsModal";
import { AnalyticsInfoCard } from "@/components/charts/AnalyticsInfoCard";
```

---

## Component API Reference

### 1. InteractiveLineChart

**Purpose:** Display time-series data with interactive data points

**Props:**
```typescript
interface InteractiveLineChartProps {
  data: Array<{
    label: string;           // X-axis label (e.g., "Jan 1")
    value: number;           // Y-axis value
    tooltip?: string;        // Displayed on tap
  }>;
  height?: number;           // Chart height in pixels (default: 240)
  onDataPointPress?: (index: number, data: LineChartDataPoint) => void;
  showTooltip?: boolean;     // Show tooltip on interaction (default: true)
}
```

**Usage Example:**
```typescript
<InteractiveLineChart
  data={[
    { label: "Mon", value: 45, tooltip: "45% complete" },
    { label: "Tue", value: 52, tooltip: "52% complete" },
    { label: "Wed", value: 68, tooltip: "68% complete" },
  ]}
  height={220}
  onDataPointPress={(index, data) => {
    console.log(`Clicked point ${index}:`, data);
  }}
/>
```

**Visual Feedback:**
- Tap on data point → Point enlarges and highlights
- Tooltip appears below chart
- Line shows grid for reference

---

### 2. InteractiveBarChart

**Purpose:** Display categorical data with interactive bars

**Props:**
```typescript
interface InteractiveBarChartProps {
  data: Array<{
    label: string;           // Category name
    value: number;           // Bar height value
    tooltip?: string;        // Displayed when selected
  }>;
  maxValue?: number;         // Max Y-axis value (auto-calculated if not provided)
  height?: number;           // Chart height in pixels (default: 240)
  onBarPress?: (index: number, data: BarChartDataPoint) => void;
}
```

**Usage Example:**
```typescript
<InteractiveBarChart
  data={[
    { label: "Mon", value: 8, tooltip: "8 tasks completed" },
    { label: "Tue", value: 5, tooltip: "5 tasks completed" },
    { label: "Wed", value: 12, tooltip: "12 tasks completed" },
  ]}
  maxValue={15}
  height={220}
  onBarPress={(index, data) => {
    setSelectedBar(data);
  }}
/>
```

**Visual Feedback:**
- Tap on bar → Bar highlights and shows details below
- Details box shows bar label, value, and tooltip
- Bar changes color based on selection

---

### 3. InteractiveGaugeChart

**Purpose:** Display a single metric on a gauge (semicircle) with status

**Props:**
```typescript
interface InteractiveGaugeChartProps {
  value: number;                           // Current value (0-maxValue)
  maxValue?: number;                       // Max value (default: 100)
  label?: string;                          // Label below value
  riskLevel?: "GREEN" | "YELLOW" | "RED"; // Color coding
  onPress?: () => void;                    // Tap handler
  description?: string;                    // Status description
  recommendations?: string[];              // Action items
}
```

**Usage Example:**
```typescript
<InteractiveGaugeChart
  value={45}
  maxValue={100}
  label="/100"
  riskLevel="YELLOW"
  description="Progress is moderate"
  recommendations={[
    "Increase team velocity",
    "Address blocking issues",
  ]}
  onPress={() => setShowRiskModal(true)}
/>
```

**Visual Features:**
- Semicircular gauge showing progress
- Status badge with risk level
- Recommendations displayed below
- Color changes based on riskLevel

---

### 4. AnalyticsModal

**Purpose:** Display detailed data breakdown in a modal

**Props:**
```typescript
interface AnalyticsModalProps {
  visible: boolean;                         // Show/hide modal
  title: string;                            // Modal title
  description: string;                      // Modal description
  data: Array<{
    label: string;                         // Data point label
    value: number | string;                // Data value
    unit?: string;                         // Unit suffix (e.g., "hours")
    tooltip?: string;                      // Explanation text
  }>;
  onClose: () => void;                     // Close handler
  icon?: string;                           // Ionicons name
}
```

**Usage Example:**
```typescript
<AnalyticsModal
  visible={modalVisible}
  title="Risk Score Details"
  description="Breakdown of risk assessment"
  icon="alert-circle"
  data={[
    {
      label: "Current Risk Score",
      value: 72,
      unit: "/100",
      tooltip: "Overall project risk level",
    },
    {
      label: "Stagnant Tasks",
      value: 5,
      tooltip: "Number of blocked tasks",
    },
  ]}
  onClose={() => setModalVisible(false)}
/>
```

**Features:**
- Slides up from bottom
- Scrollable content area
- Data displayed in grid format
- Close button at bottom

---

### 5. AnalyticsInfoCard

**Purpose:** Display supplementary metrics in a compact card

**Props:**
```typescript
interface AnalyticsInfoCardProps {
  title: string;                           // Card title
  icon: string;                            // Ionicons name
  description: string;                     // Description text
  details?: Array<{
    label: string;                         // Detail label
    value: string | number;                // Detail value
  }>;
  onPress?: () => void;                    // Tap handler (optional)
}
```

**Usage Example:**
```typescript
<AnalyticsInfoCard
  title="Projected Completion"
  icon="flag"
  description="Estimated completion date"
  details={[
    { label: "Days Late", value: 5 },
    { label: "Confidence", value: "78%" },
  ]}
  onPress={() => showDetailModal()}
/>
```

**Features:**
- Compact info display
- Icon-based visual identification
- Optional details grid
- Optional press handler for drill-down

---

## State Management Pattern

### For Modal Interactions:

```typescript
const [riskModalVisible, setRiskModalVisible] = useState(false);

// Open modal
const handleRiskPress = () => {
  setRiskModalVisible(true);
};

// Close modal
const handleRiskClose = () => {
  setRiskModalVisible(false);
};

// Render
<InteractiveGaugeChart
  value={reportData.riskScore}
  onPress={handleRiskPress}
/>

<AnalyticsModal
  visible={riskModalVisible}
  title="Risk Assessment"
  data={riskData}
  onClose={handleRiskClose}
/>
```

### For Chart Interactions:

```typescript
const [selectedBarData, setSelectedBarData] = useState<any>(null);

// Handle bar selection
const handleBarPress = (index: number, data: any) => {
  setSelectedBarData(data);
  // Can also trigger modal or other actions
};

// Render
<InteractiveBarChart
  data={velocityData}
  onBarPress={handleBarPress}
/>
```

---

## Color Constants (from Colors.ts)

| Constant | Usage |
|----------|-------|
| `Colors.PRIMARY` | Primary action, selected state |
| `Colors.SUCCESS` | Good status (70%+ complete) |
| `Colors.WARNING` | Caution status (40-70% complete) |
| `Colors.ERROR` | Critical status (<40% complete) |
| `Colors.INFO` | Information, charts |
| `Colors.TEXT_PRIMARY` | Main text |
| `Colors.TEXT_SECONDARY` | Secondary text |
| `Colors.TEXT_MUTED` | Disabled/hint text |
| `Colors.BG_CARD` | Card backgrounds |
| `Colors.BG_DARK` | Page backgrounds |
| `Colors.BORDER` | Border colors |

---

## Styling Best Practices

### Chart Container Spacing:
```typescript
const chartContainer = {
  paddingVertical: 12,
  gap: 12,  // Space between elements
};
```

### Section Descriptions:
Always include a description explaining what users are looking at:

```typescript
<Text style={s.sectionDescription}>
  Kecepatan pengerjaan tasks per hari. Tap pada bar untuk melihat detail.
</Text>
```

### Interactive Element Feedback:
```typescript
<TouchableOpacity
  onPress={handlePress}
  activeOpacity={0.8}  // Slight fade on tap
>
  {/* Content */}
</TouchableOpacity>
```

---

## Common Patterns

### Pattern 1: Chart with Detail Modal

```typescript
export function AnalyticsScreen() {
  const [velocityModalVisible, setVelocityModalVisible] = useState(false);
  const [selectedVelocityData, setSelectedVelocityData] = useState<any>(null);

  const handleVelocityBarPress = (index: number, data: any) => {
    setSelectedVelocityData(data);
    setVelocityModalVisible(true);
  };

  return (
    <>
      <InteractiveBarChart
        data={velocityData}
        onBarPress={handleVelocityBarPress}
      />

      <AnalyticsModal
        visible={velocityModalVisible && selectedVelocityData}
        title="Velocity Details"
        description="Task completion for this period"
        data={[
          { label: "Tasks", value: selectedVelocityData?.value },
          { label: "Date", value: selectedVelocityData?.label },
        ]}
        onClose={() => setVelocityModalVisible(false)}
      />
    </>
  );
}
```

### Pattern 2: Gauge with Recommendations

```typescript
<InteractiveGaugeChart
  value={riskScore}
  riskLevel={riskScore > 66 ? "RED" : riskScore > 33 ? "YELLOW" : "GREEN"}
  description={getDescription(riskScore)}
  recommendations={getRecommendations(riskScore)}
  onPress={() => setRiskModalVisible(true)}
/>
```

### Pattern 3: Info Card with Details

```typescript
<AnalyticsInfoCard
  title="Key Metric"
  icon="trending-up"
  description="Description of the metric"
  details={[
    { label: "Current", value: currentValue },
    { label: "Target", value: targetValue },
    { label: "Progress", value: `${progressPercent}%` },
  ]}
  onPress={() => navigateToDetail()}
/>
```

---

## Testing Tips

### Testing Interactive Charts:
1. Tap on different data points
2. Verify tooltip appears with correct data
3. Check that onPress handler fires
4. Verify visual feedback (highlight, color change)

### Testing Modals:
1. Verify modal slides up from bottom
2. Check all data displays correctly
3. Verify tooltips show on data items
4. Test close button functionality

### Testing Responsive Layout:
1. Test on different screen sizes
2. Check text wrapping
3. Verify spacing remains consistent
4. Test on both portrait and landscape

---

## Performance Tips

1. **Memoize handlers:**
```typescript
const handleBarPress = useCallback((index, data) => {
  setSelectedData(data);
}, []);
```

2. **Limit chart data:**
- Keep data points under 30 for smooth rendering
- Aggregate older data if needed

3. **Lazy load modals:**
- Don't render modal content until visible

---

## Accessibility Considerations

1. All interactive elements have sufficient touch targets (min 44x44)
2. Icons have descriptions via labels
3. Color isn't the only indicator (use badges, icons, text)
4. Modal closes properly on Android back button

---

## Troubleshooting

**Q: Chart data not showing?**
- A: Ensure data array has at least 2 items
- A: Check if values are numbers (not strings)

**Q: Modal not opening?**
- A: Verify `visible` prop is set to true
- A: Check state update is happening in onPress handler

**Q: Tap not working?**
- A: Ensure TouchableOpacity activeOpacity is set correctly
- A: Check onPress handler exists

**Q: Colors look wrong?**
- A: Verify Colors import from "@/constants/Colors"
- A: Check that riskLevel prop is set for gauge charts

---

For more examples, see `ANALYTICS_GUIDE.md` for user documentation.
