// Inventory calculation utilities

// Helper function to safely sum numbers
function sum(...numbers) {
  return numbers.reduce((acc, val) => acc + (Number(val) || 0), 0);
}

// Calculate all computed fields for an inventory item
export function calc(item) {
  // Total Other Use = Training + Conference + GSM + Prospect + Applicant + Visitor + Other
  const totalOther = sum(
    item.training,
    item.conference,
    item.gsm,
    item.prospect,
    item.applicant,
    item.visitor,
    item.other
  );
  
  // Spares (Auto Fills) = Spares On the Floor + Spares in Storage
  const sparesAuto = sum(item.floor, item.storage);
  
  // Total = In Use by Employees + Total Other Use + Spares (Auto Fills) + Broken
  const total = sum(item.inUse, totalOther, sparesAuto, item.broken);
  
  return {
    ...item,
    totalOther,
    sparesAuto,
    total
  };
}

// Calculate all items with formulas
export function calcAll(items) {
  return items.map(calc);
}

// Get summary totals for all items
export function getSummaryTotals(items) {
  const calculatedItems = calcAll(items);
  
  return {
    totalInUse: sum(...calculatedItems.map(item => item.inUse)),
    totalOther: sum(...calculatedItems.map(item => item.totalOther)),
    totalSpares: sum(...calculatedItems.map(item => item.sparesAuto)),
    totalBroken: sum(...calculatedItems.map(item => item.broken)),
    grandTotal: sum(...calculatedItems.map(item => item.total))
  };
}