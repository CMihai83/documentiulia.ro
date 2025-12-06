'use client';

import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, ChevronDown, X, Loader2 } from 'lucide-react';

interface AddressInputProps {
  value?: AddressData;
  onChange?: (address: AddressData) => void;
  showMap?: boolean;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  error?: string;
  className?: string;
}

interface AddressData {
  street?: string;
  number?: string;
  building?: string;
  staircase?: string;
  floor?: string;
  apartment?: string;
  county?: string;
  countyCode?: string;
  city?: string;
  cityCode?: string;
  postalCode?: string;
  country?: string;
  fullAddress?: string;
}

interface SIRUTALocation {
  code: string;
  name: string;
  type: 'county' | 'city' | 'village' | 'sector';
  countyCode?: string;
  countyName?: string;
}

// Romanian counties (SIRUTA codes)
const ROMANIAN_COUNTIES: SIRUTALocation[] = [
  { code: '01', name: 'Alba', type: 'county' },
  { code: '02', name: 'Arad', type: 'county' },
  { code: '03', name: 'Argeș', type: 'county' },
  { code: '04', name: 'Bacău', type: 'county' },
  { code: '05', name: 'Bihor', type: 'county' },
  { code: '06', name: 'Bistrița-Năsăud', type: 'county' },
  { code: '07', name: 'Botoșani', type: 'county' },
  { code: '08', name: 'Brașov', type: 'county' },
  { code: '09', name: 'Brăila', type: 'county' },
  { code: '10', name: 'Buzău', type: 'county' },
  { code: '11', name: 'Caraș-Severin', type: 'county' },
  { code: '12', name: 'Cluj', type: 'county' },
  { code: '13', name: 'Constanța', type: 'county' },
  { code: '14', name: 'Covasna', type: 'county' },
  { code: '15', name: 'Dâmbovița', type: 'county' },
  { code: '16', name: 'Dolj', type: 'county' },
  { code: '17', name: 'Galați', type: 'county' },
  { code: '18', name: 'Gorj', type: 'county' },
  { code: '19', name: 'Harghita', type: 'county' },
  { code: '20', name: 'Hunedoara', type: 'county' },
  { code: '21', name: 'Ialomița', type: 'county' },
  { code: '22', name: 'Iași', type: 'county' },
  { code: '23', name: 'Ilfov', type: 'county' },
  { code: '24', name: 'Maramureș', type: 'county' },
  { code: '25', name: 'Mehedinți', type: 'county' },
  { code: '26', name: 'Mureș', type: 'county' },
  { code: '27', name: 'Neamț', type: 'county' },
  { code: '28', name: 'Olt', type: 'county' },
  { code: '29', name: 'Prahova', type: 'county' },
  { code: '30', name: 'Satu Mare', type: 'county' },
  { code: '31', name: 'Sălaj', type: 'county' },
  { code: '32', name: 'Sibiu', type: 'county' },
  { code: '33', name: 'Suceava', type: 'county' },
  { code: '34', name: 'Teleorman', type: 'county' },
  { code: '35', name: 'Timiș', type: 'county' },
  { code: '36', name: 'Tulcea', type: 'county' },
  { code: '37', name: 'Vaslui', type: 'county' },
  { code: '38', name: 'Vâlcea', type: 'county' },
  { code: '39', name: 'Vrancea', type: 'county' },
  { code: '40', name: 'București', type: 'county' },
  { code: '51', name: 'Călărași', type: 'county' },
  { code: '52', name: 'Giurgiu', type: 'county' },
];

// Major cities for each county (simplified - full SIRUTA would be from API)
const MAJOR_CITIES: Record<string, SIRUTALocation[]> = {
  '40': [
    { code: '401', name: 'Sector 1', type: 'sector', countyCode: '40', countyName: 'București' },
    { code: '402', name: 'Sector 2', type: 'sector', countyCode: '40', countyName: 'București' },
    { code: '403', name: 'Sector 3', type: 'sector', countyCode: '40', countyName: 'București' },
    { code: '404', name: 'Sector 4', type: 'sector', countyCode: '40', countyName: 'București' },
    { code: '405', name: 'Sector 5', type: 'sector', countyCode: '40', countyName: 'București' },
    { code: '406', name: 'Sector 6', type: 'sector', countyCode: '40', countyName: 'București' },
  ],
  '12': [
    { code: '12001', name: 'Cluj-Napoca', type: 'city', countyCode: '12', countyName: 'Cluj' },
    { code: '12002', name: 'Turda', type: 'city', countyCode: '12', countyName: 'Cluj' },
    { code: '12003', name: 'Dej', type: 'city', countyCode: '12', countyName: 'Cluj' },
    { code: '12004', name: 'Câmpia Turzii', type: 'city', countyCode: '12', countyName: 'Cluj' },
    { code: '12005', name: 'Gherla', type: 'city', countyCode: '12', countyName: 'Cluj' },
  ],
  '35': [
    { code: '35001', name: 'Timișoara', type: 'city', countyCode: '35', countyName: 'Timiș' },
    { code: '35002', name: 'Lugoj', type: 'city', countyCode: '35', countyName: 'Timiș' },
    { code: '35003', name: 'Sânnicolau Mare', type: 'city', countyCode: '35', countyName: 'Timiș' },
    { code: '35004', name: 'Jimbolia', type: 'city', countyCode: '35', countyName: 'Timiș' },
  ],
  '22': [
    { code: '22001', name: 'Iași', type: 'city', countyCode: '22', countyName: 'Iași' },
    { code: '22002', name: 'Pașcani', type: 'city', countyCode: '22', countyName: 'Iași' },
    { code: '22003', name: 'Hârlău', type: 'city', countyCode: '22', countyName: 'Iași' },
    { code: '22004', name: 'Târgu Frumos', type: 'city', countyCode: '22', countyName: 'Iași' },
  ],
  '13': [
    { code: '13001', name: 'Constanța', type: 'city', countyCode: '13', countyName: 'Constanța' },
    { code: '13002', name: 'Mangalia', type: 'city', countyCode: '13', countyName: 'Constanța' },
    { code: '13003', name: 'Medgidia', type: 'city', countyCode: '13', countyName: 'Constanța' },
    { code: '13004', name: 'Năvodari', type: 'city', countyCode: '13', countyName: 'Constanța' },
  ],
  '08': [
    { code: '08001', name: 'Brașov', type: 'city', countyCode: '08', countyName: 'Brașov' },
    { code: '08002', name: 'Făgăraș', type: 'city', countyCode: '08', countyName: 'Brașov' },
    { code: '08003', name: 'Săcele', type: 'city', countyCode: '08', countyName: 'Brașov' },
    { code: '08004', name: 'Codlea', type: 'city', countyCode: '08', countyName: 'Brașov' },
  ],
};

// Generate full address string
function generateFullAddress(address: AddressData): string {
  const parts: string[] = [];

  if (address.street) {
    let streetPart = address.street;
    if (address.number) streetPart += ` nr. ${address.number}`;
    if (address.building) streetPart += `, bl. ${address.building}`;
    if (address.staircase) streetPart += `, sc. ${address.staircase}`;
    if (address.floor) streetPart += `, et. ${address.floor}`;
    if (address.apartment) streetPart += `, ap. ${address.apartment}`;
    parts.push(streetPart);
  }

  if (address.city) parts.push(address.city);
  if (address.county) parts.push(`jud. ${address.county}`);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);

  return parts.join(', ');
}

export function AddressInput({
  value = {},
  onChange,
  showMap = false,
  required = false,
  disabled = false,
  label = 'Adresă',
  error: externalError,
  className,
}: AddressInputProps) {
  const [address, setAddress] = useState<AddressData>(value);
  const [countyOpen, setCountyOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countySearch, setCountySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cities, setCities] = useState<SIRUTALocation[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const countyRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countyRef.current && !countyRef.current.contains(event.target as Node)) {
        setCountyOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setCityOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load cities when county changes
  useEffect(() => {
    if (address.countyCode) {
      setIsLoadingCities(true);
      // In production, this would be an API call to get SIRUTA localities
      // For now, use the hardcoded major cities
      const countyCities = MAJOR_CITIES[address.countyCode] || [];
      setCities(countyCities);
      setIsLoadingCities(false);
    } else {
      setCities([]);
    }
  }, [address.countyCode]);

  // Update parent when address changes
  useEffect(() => {
    const fullAddress = generateFullAddress(address);
    onChange?.({ ...address, fullAddress, country: 'România' });
  }, [address, onChange]);

  const filteredCounties = ROMANIAN_COUNTIES.filter(county =>
    county.name.toLowerCase().includes(countySearch.toLowerCase())
  );

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleCountySelect = (county: SIRUTALocation) => {
    setAddress(prev => ({
      ...prev,
      county: county.name,
      countyCode: county.code,
      city: undefined,
      cityCode: undefined,
    }));
    setCountyOpen(false);
    setCountySearch('');
  };

  const handleCitySelect = (city: SIRUTALocation) => {
    setAddress(prev => ({
      ...prev,
      city: city.name,
      cityCode: city.code,
    }));
    setCityOpen(false);
    setCitySearch('');
  };

  const handleFieldChange = (field: keyof AddressData, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const inputClasses = cn(
    'w-full px-3 py-2 rounded-lg border transition-colors text-sm',
    'bg-white dark:bg-gray-800',
    'border-gray-200 dark:border-gray-700',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    disabled && 'opacity-50 cursor-not-allowed'
  );

  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <MapPin className="inline-block w-4 h-4 mr-1" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* County and City Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* County Selector */}
        <div ref={countyRef} className="relative">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Județ
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setCountyOpen(!countyOpen)}
            className={cn(
              inputClasses,
              'flex items-center justify-between text-left',
              !address.county && 'text-gray-400'
            )}
          >
            <span className="truncate">{address.county || 'Selectează județul'}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', countyOpen && 'rotate-180')} />
          </button>

          {countyOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
              <div className="sticky top-0 p-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <input
                  type="text"
                  value={countySearch}
                  onChange={(e) => setCountySearch(e.target.value)}
                  placeholder="Caută județ..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded"
                  autoFocus
                />
              </div>
              {filteredCounties.map(county => (
                <button
                  key={county.code}
                  type="button"
                  onClick={() => handleCountySelect(county)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                    address.countyCode === county.code && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  )}
                >
                  {county.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* City Selector */}
        <div ref={cityRef} className="relative">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Localitate
          </label>
          <button
            type="button"
            disabled={disabled || !address.countyCode}
            onClick={() => setCityOpen(!cityOpen)}
            className={cn(
              inputClasses,
              'flex items-center justify-between text-left',
              !address.city && 'text-gray-400',
              !address.countyCode && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoadingCities ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="truncate">{address.city || 'Selectează localitatea'}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', cityOpen && 'rotate-180')} />
              </>
            )}
          </button>

          {cityOpen && cities.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
              <div className="sticky top-0 p-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Caută localitate..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded"
                  autoFocus
                />
              </div>
              {filteredCities.map(city => (
                <button
                  key={city.code}
                  type="button"
                  onClick={() => handleCitySelect(city)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                    address.cityCode === city.code && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  )}
                >
                  {city.name}
                  <span className="text-xs text-gray-400 ml-2">
                    {city.type === 'sector' ? 'sector' : city.type === 'city' ? 'oraș' : 'comună'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Street and Number Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Strada
          </label>
          <input
            type="text"
            value={address.street || ''}
            onChange={(e) => handleFieldChange('street', e.target.value)}
            disabled={disabled}
            placeholder="Str. Exemplu"
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Număr
          </label>
          <input
            type="text"
            value={address.number || ''}
            onChange={(e) => handleFieldChange('number', e.target.value)}
            disabled={disabled}
            placeholder="123"
            className={inputClasses}
          />
        </div>
      </div>

      {/* Building Details Row */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Bloc
          </label>
          <input
            type="text"
            value={address.building || ''}
            onChange={(e) => handleFieldChange('building', e.target.value)}
            disabled={disabled}
            placeholder="A1"
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Scara
          </label>
          <input
            type="text"
            value={address.staircase || ''}
            onChange={(e) => handleFieldChange('staircase', e.target.value)}
            disabled={disabled}
            placeholder="B"
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Etaj
          </label>
          <input
            type="text"
            value={address.floor || ''}
            onChange={(e) => handleFieldChange('floor', e.target.value)}
            disabled={disabled}
            placeholder="2"
            className={inputClasses}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Apartament
          </label>
          <input
            type="text"
            value={address.apartment || ''}
            onChange={(e) => handleFieldChange('apartment', e.target.value)}
            disabled={disabled}
            placeholder="15"
            className={inputClasses}
          />
        </div>
      </div>

      {/* Postal Code */}
      <div className="w-32">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Cod poștal
        </label>
        <input
          type="text"
          value={address.postalCode || ''}
          onChange={(e) => handleFieldChange('postalCode', e.target.value.replace(/\D/g, '').substring(0, 6))}
          disabled={disabled}
          placeholder="123456"
          maxLength={6}
          className={inputClasses}
        />
      </div>

      {/* Full Address Preview */}
      {address.street && (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Adresă completă:</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {generateFullAddress(address)}
          </p>
        </div>
      )}

      {/* Error */}
      {externalError && (
        <p className="text-sm text-red-600 dark:text-red-400">{externalError}</p>
      )}
    </div>
  );
}

// Export utilities
export { generateFullAddress, ROMANIAN_COUNTIES, MAJOR_CITIES };
export type { AddressData, SIRUTALocation };
