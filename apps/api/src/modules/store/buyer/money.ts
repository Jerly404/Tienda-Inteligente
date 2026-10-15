/** Monetary multiplication uses integer céntimos; inputs have at most two decimals. */
export function cents(value:number):number {
  const result=Math.round(value*100);
  if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(result)) throw new Error('Monto fuera de rango.');
  return result;
}
export function amount(value:number):number {
  if(!Number.isSafeInteger(value))throw new Error('Monto fuera de rango.');
  return value/100;
}
export function purchaseTotals(items:Array<{packages:number;packagePrice:number}>,delivery:number){
  const lines=items.map(item=>{if(!Number.isInteger(item.packages)||item.packages<1)throw new Error('Cantidad inválida.');return cents(item.packagePrice)*item.packages;});
  const subtotal=lines.reduce((sum,line)=>sum+line,0), total=subtotal+cents(delivery);
  return {lines:lines.map(amount),subtotal:amount(subtotal),total:amount(total)};
}
export function csvCell(value:unknown):string {
  let text=String(value??'');
  if(/^[=+\-@\t\r]/.test(text))text=`'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}
