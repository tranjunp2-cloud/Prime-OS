// Keep only address fields; never flatten arbitrary webhook/contact metadata.
export function orderAddressLines(address: Record<string, unknown>, phone = '', email = ''): string[] {
  const clean = (value: unknown) => {
    if (typeof value !== 'string') return '';
    let text = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '');
    for (const contact of [phone, email]) if (contact) text = text.split(contact).join('');
    return text.replace(/\b(email|phone|tel|sđt)\s*[:：]?\s*(?=[,;|]|$)/gi, '').replace(/\s*[,;|]\s*[,;|]+/g, ', ').replace(/^[\s,;|]+|[\s,;|]+$/g, '').trim();
  };
  const street = clean(address.address || address.addressLine1 || address.street);
  const region = [address.ward, address.district, address.city || address.province, address.postalCode, address.country].map(clean).filter(Boolean).join(', ');
  return [...new Set([street, clean(address.addressLine2), region].filter(Boolean))];
}
