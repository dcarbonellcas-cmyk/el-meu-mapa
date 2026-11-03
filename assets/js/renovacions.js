// One calendar month, clamped to the final day of the following month.
function nextRenewalDate(value){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return null;
  const day=date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth()+1);
  const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
  date.setDate(Math.min(day,last));
  return date;
}
