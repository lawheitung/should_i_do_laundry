// Convert UTC → SGT (+8)
export function toSGT(isoString) {
    if (!isoString) return null;
  
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
      return isoString;
    }
  
    const date = new Date(isoString);
    const sgtDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  
    return sgtDate.toISOString().replace(".000Z", "+08:00");
  }
  
  export function groupByDay(events) {
    const grouped = {};
  
    for (const e of events) {
      const dayKey = e.all_day
        ? e.start_sgt
        : new Date(e.start_sgt).toISOString().split("T")[0];
  
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(e);
    }
  
    return grouped;
  }
  