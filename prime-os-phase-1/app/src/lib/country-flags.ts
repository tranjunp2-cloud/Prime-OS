// Country flags utility — referenced by WarehouseTable and MovementsTable

export function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    JP: '🇯🇵',
    SG: '🇸🇬',
    MY: '🇲🇾',
    VN: '🇻🇳',
    US: '🇺🇸',
    UK: '🇬🇧',
    AU: '🇦🇺',
    TH: '🇹🇭',
    KR: '🇰🇷',
    CN: '🇨🇳',
    TW: '🇹🇼',
    HK: '🇭🇰',
    PH: '🇵🇭',
    ID: '🇮🇩',
  };
  return flags[country] ?? '🌐';
}
