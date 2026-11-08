const renewalMonthsKey = 'applicationRenewalMonths';

function applicationRenewalMonths(){
  return globalThis.localStorage?.getItem(renewalMonthsKey) === '3' ? 3 : 1;
}

// Calendar months, clamped to the final day of the destination month.
function nextRenewalDate(value, months = applicationRenewalMonths()){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return null;
  const day=date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth()+months);
  const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
  date.setDate(Math.min(day,last));
  return date;
}
