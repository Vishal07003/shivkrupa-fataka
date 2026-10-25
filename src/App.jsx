import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  Search, 
  Trash2, 
  Phone, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  X, 
  Minus, 
  Plus, 
  Truck, 
  Layers,
  ShoppingBag,
  Navigation,
  Loader2,
  ExternalLink,
  RefreshCw,
  Link as LinkIcon,
  Map as MapIcon
} from 'lucide-react';
import { SHOP_CONFIG, CATEGORIES, PRODUCTS } from './data/products';
import { translations } from './i18n/translations';

function App() {
  // Shared Language State with localStorage persistence
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('shivkrupa_lang');
      return saved === 'en' || saved === 'mr' ? saved : 'mr';
    } catch {
      return 'mr';
    }
  });

  // Keep localStorage & document language in sync
  useEffect(() => {
    try {
      localStorage.setItem('shivkrupa_lang', lang);
    } catch (e) {
      console.warn('Failed to save language to localStorage', e);
    }
    document.documentElement.lang = lang;
  }, [lang]);

  // Current translation dictionary
  const t = translations[lang] || translations.mr;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Quantities State: { [productId]: quantity }
  // Keyed by numeric product ID
  const [quantities, setQuantities] = useState({});

  // Delivery Area & Customer Form State
  const [deliveryArea, setDeliveryArea] = useState('nashik'); // 'nashik' | 'outside'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLandmark, setCustomerLandmark] = useState('');

  // Geolocation & Map Link State
  const [locationCoords, setLocationCoords] = useState(null); // { latitude, longitude, accuracy, timestamp } | null
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'locating' | 'success' | 'error'
  const [locationErrorMessage, setLocationErrorMessage] = useState('');
  const [customMapsLink, setCustomMapsLink] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedMapCoords, setPickedMapCoords] = useState(null);

  // Form Validation Errors State
  const [formErrors, setFormErrors] = useState({});

  // Order Details Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fast direct lookup map for all products by ID
  const productById = useMemo(() => {
    const map = new Map();
    PRODUCTS.forEach(p => map.set(Number(p.id), p));
    return map;
  }, []);

  // Quantity Change Handlers
  const handleQuantityChange = useCallback((rawId, delta) => {
    const numId = Number(rawId);
    setQuantities(prev => {
      const current = Number(prev[numId]) || 0;
      const next = current + delta;
      const nextObj = { ...prev };
      if (next <= 0) {
        delete nextObj[numId];
      } else {
        nextObj[numId] = Math.min(next, 999);
      }
      return nextObj;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    if (Object.keys(quantities).length === 0) return;
    if (window.confirm(t.confirmClear)) {
      setQuantities({});
    }
  }, [quantities, t.confirmClear]);

  // Filtered Products for Display
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return PRODUCTS.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (query) {
        const matchesMr = (p.nameMr || '').toLowerCase().includes(query);
        const matchesEn = (p.nameEn || '').toLowerCase().includes(query);
        const matchesPrice = String(p.price).includes(query);
        const matchesId = String(p.id) === query;
        return matchesMr || matchesEn || matchesPrice || matchesId;
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  // Single Source of Truth for Selected Products with Line Totals
  const selectedItems = useMemo(() => {
    const list = [];
    Object.entries(quantities).forEach(([idStr, qtyVal]) => {
      const numId = Number(idStr);
      const qty = Number(qtyVal) || 0;
      if (qty > 0) {
        const p = productById.get(numId);
        if (p) {
          const unitPrice = Number(p.price) || 0;
          list.push({
            ...p,
            qty,
            unitPrice,
            lineTotal: unitPrice * qty
          });
        }
      }
    });
    // Sort consistently by product id
    list.sort((a, b) => a.id - b.id);
    return list;
  }, [quantities, productById]);

  // Accurate Calculations Derived from the Single Source of Truth
  const subtotal = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + (Number(item.lineTotal) || 0), 0);
  }, [selectedItems]);

  const totalItemCount = useMemo(() => {
    return selectedItems.length;
  }, [selectedItems]);

  const totalUnits = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + (Number(item.qty) || 0), 0);
  }, [selectedItems]);

  const grandTotal = subtotal;

  // Request Fresh, High-Accuracy Location via Browser Geolocation API
  const handleGetLocation = () => {
    setLocationErrorMessage('');
    
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationErrorMessage(t.locationNotSupportedError);
      return;
    }

    setLocationStatus('locating');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Read actual browser reported coordinates and accuracy in meters
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const rawAccuracy = position.coords.accuracy;
        const accuracy = Math.round(rawAccuracy || 0);

        setLocationCoords({
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          accuracy,
          isManualMapPick: false
        });
        setLocationStatus('success');
        setLocationErrorMessage('');
      },
      (error) => {
        setLocationStatus('error');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationErrorMessage(t.locationDeniedError);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationErrorMessage(t.locationUnavailableError);
        } else if (error.code === error.TIMEOUT) {
          setLocationErrorMessage(t.locationTimeoutError);
        } else {
          setLocationErrorMessage(t.locationUnavailableError);
        }
      },
      {
        enableHighAccuracy: true, // Forces GPS / hardware location when supported
        timeout: 20000,          // 20-second timeout to allow GPS to acquire fix
        maximumAge: 0            // Zero cache age: always request a brand new reading
      }
    );
  };

  const handleClearLocation = () => {
    setLocationCoords(null);
    setLocationStatus('idle');
    setLocationErrorMessage('');
  };

  // Interactive Map Picker: Set Nashik center if no coords yet
  const openMapPicker = () => {
    const baseLat = locationCoords?.latitude || 19.9975;
    const baseLng = locationCoords?.longitude || 73.7898;
    setPickedMapCoords({ lat: baseLat, lng: baseLng });
    setShowMapPicker(true);
  };

  const handleConfirmPickedLocation = () => {
    if (pickedMapCoords) {
      setLocationCoords({
        latitude: Number(pickedMapCoords.lat.toFixed(6)),
        longitude: Number(pickedMapCoords.lng.toFixed(6)),
        accuracy: 10, // Exact interactive map pin placement
        isManualMapPick: true
      });
      setLocationStatus('success');
      setLocationErrorMessage('');
    }
    setShowMapPicker(false);
  };

  // Indian Mobile Number Validation: 10 digits starting with 6, 7, 8, or 9
  const validatePhone = (phoneStr) => {
    const cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return true;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]\d{9}$/.test(cleaned.slice(2))) {
      return true;
    }
    if (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]\d{9}$/.test(cleaned.slice(1))) {
      return true;
    }
    return false;
  };

  // Validate Required Customer Fields
  const validateForm = () => {
    const errors = {};

    if (!customerName.trim()) {
      errors.name = t.errNameRequired;
    }

    if (!customerPhone.trim()) {
      errors.phone = t.errPhoneRequired;
    } else if (!validatePhone(customerPhone.trim())) {
      errors.phone = t.errPhoneInvalid;
    }

    if (!customerAddress.trim()) {
      errors.address = t.errAddressRequired;
    }

    if (customMapsLink.trim()) {
      const link = customMapsLink.trim().toLowerCase();
      const isLikelyMaps = link.includes('google.com/maps') || link.includes('maps.app.goo.gl') || link.includes('goo.gl/maps');
      if (!isLikelyMaps && !link.startsWith('http')) {
        errors.customMaps = t.mapsLinkInvalid;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // WhatsApp Message Generator - Clean, plain-text without markdown stars, HTML, or corrupted characters
  const generateWhatsAppUrl = useCallback(() => {
    if (selectedItems.length === 0) return '#';

    const isMr = lang === 'mr';
    const lines = [];

    // Header
    lines.push(t.waHeaderTitle);
    lines.push('');
    lines.push(t.waHeaderSub);
    lines.push('');

    // Customer & Delivery Details
    lines.push(t.waCustomerSection);
    lines.push(`${t.waCustomerNameLabel} ${customerName.trim()}`);
    lines.push(`${t.waCustomerPhoneLabel} ${customerPhone.trim()}`);
    lines.push(`${t.waDeliveryAreaLabel} ${deliveryArea === 'nashik' ? t.waDeliveryNashikValue : t.waDeliveryOutsideValue}`);
    lines.push(`${t.waAddressLabel} ${customerAddress.trim()}`);
    if (customerLandmark.trim()) {
      lines.push(`${t.waLandmarkLabel} ${customerLandmark.trim()}`);
    }

    // Only include GPS coordinates if actually captured
    if (locationCoords && locationCoords.latitude && locationCoords.longitude) {
      lines.push('');
      lines.push(t.waLocationHeader);
      lines.push(`${t.waCoordinatesLabel} ${locationCoords.latitude}, ${locationCoords.longitude}`);
      if (locationCoords.accuracy) {
        lines.push(`${t.waAccuracyLabel} ~${locationCoords.accuracy}${t.metersSuffix.trim()}${locationCoords.isManualMapPick ? ' (Map Pin)' : ''}`);
      }
      lines.push(`${t.waMapsLinkLabel} https://maps.google.com/?q=${locationCoords.latitude},${locationCoords.longitude}`);
    }

    // Include customer-pasted Maps link if provided
    if (customMapsLink.trim()) {
      lines.push(`${t.waCustomMapsLinkLabel} ${customMapsLink.trim()}`);
    }

    lines.push('');

    // Selected products list
    lines.push(t.waSelectedProductsHeader);
    selectedItems.forEach((item, index) => {
      const displayName = isMr ? item.nameMr : item.nameEn;
      const unit = isMr ? item.unitMr : item.unitEn;
      // Clean readable packing format: replace inside parentheses
      const cleanUnit = unit.replace(/[()]/g, '').trim();
      lines.push(`${index + 1}. ${displayName}`);
      lines.push(`   ${item.qty} x ₹${item.unitPrice} (${cleanUnit}) = ₹${item.lineTotal}`);
      lines.push('');
    });

    lines.push(`${t.waTotalItemsLabel} ${totalItemCount}`);
    lines.push(`${t.waTotalUnitsLabel} ${totalUnits}`);
    lines.push(`${t.waSubtotalLabel} ₹${subtotal}`);

    if (deliveryArea === 'nashik') {
      lines.push(t.waDeliveryNashikLine);
      lines.push(`${t.waGrandTotalLabel} ₹${grandTotal}`);
    } else {
      lines.push(t.waDeliveryOutsideLine);
      lines.push(`${t.waOutsideTotalLabel} ₹${grandTotal} ${t.waOutsideSuffix}`);
    }

    lines.push('');
    lines.push(t.waClosingMessage);

    const messageText = lines.join('\n');
    return `https://wa.me/${SHOP_CONFIG.whatsappNumber}?text=${encodeURIComponent(messageText)}`;
  }, [
    selectedItems, 
    lang, 
    t, 
    customerName, 
    customerPhone, 
    customerAddress, 
    customerLandmark, 
    locationCoords,
    customMapsLink,
    deliveryArea, 
    totalItemCount, 
    totalUnits, 
    subtotal, 
    grandTotal
  ]);

  const handleOrderClick = () => {
    if (selectedItems.length === 0) {
      alert(t.selectAtLeastOne);
      return;
    }
    setFormErrors({});
    setShowOrderModal(true);
  };

  const handleFormSubmitAndOpenWhatsApp = (e) => {
    if (e) e.preventDefault();
    
    // Strict validation before opening WhatsApp
    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    const url = generateWhatsAppUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#FFF8ED] text-[#281735] font-sans antialiased selection:bg-[#FF8A00] selection:text-white pb-40">
      
      {/* Top Festive Header Bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#35104F] via-[#481669] to-[#35104F] text-white shadow-md border-b border-[#FFB049]/30">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          
          {/* Brand Info */}
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl select-none" aria-hidden="true">🪔</span>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-tight flex items-center gap-1.5 text-[#FFD27A]">
                {t.shopName}
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FF8A00] text-white tracking-normal hidden xs:inline-block">
                  {t.cityBadge}
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-[#E8D7F5] truncate max-w-[210px] sm:max-w-md">
                {t.subTitle}
              </p>
            </div>
          </div>

          {/* Language Toggle & Call */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(l => l === 'mr' ? 'en' : 'mr')}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold bg-[#FFD27A] text-[#281735] hover:bg-[#FFE3A2] active:scale-95 transition-all shadow-sm flex items-center gap-1 border border-[#FFD27A]"
              title={t.switchLanguageTitle}
            >
              <span className="text-sm">🌐</span>
              <span>{t.switchLanguageBtn}</span>
            </button>

            <a
              href={`tel:+${SHOP_CONFIG.whatsappNumber}`}
              className="hidden sm:flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[#FFD27A] transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-[#FF8A00]" />
              <span>{t.phoneDisplay}</span>
            </a>
          </div>

        </div>

        {/* Free Delivery Banner */}
        <div className="bg-[#260A38] px-3 py-1.5 border-t border-white/10 text-center text-[11px] sm:text-xs text-[#FFD27A] font-medium flex items-center justify-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-[#38D39F] shrink-0" />
          <span>{t.deliveryBannerPrefix}</span>
          <strong className="text-[#38D39F] font-bold underline decoration-wavy underline-offset-2">
            {t.deliveryBannerHighlight}
          </strong>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 space-y-4">

        {/* Compact Festive Welcome & Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#35104F] via-[#481669] to-[#260A38] text-white p-4 sm:p-6 shadow-md border border-[#FFB049]/30">
          {/* Subtle Ambient Particle Glow */}
          <div className="absolute top-2 right-4 text-2xl select-none animate-festive-float opacity-70 pointer-events-none" aria-hidden="true">✨</div>
          <div className="absolute bottom-2 left-6 text-xl select-none animate-festive-float-delay opacity-60 pointer-events-none" aria-hidden="true">🪔</div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#FF8A00]/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#FF8A00]/25 text-[#FFD27A] border border-[#FF8A00]/40">
                <Sparkles className="w-3 h-3 text-[#FFD27A]" />
                <span>{t.heroBadge}</span>
              </span>
              <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug">
                {t.heroTitle}
              </h2>
              <p className="text-xs sm:text-sm text-[#E8D7F5] leading-relaxed">
                {t.heroTagline}
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('catalog');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E87500] hover:from-[#E87500] hover:to-[#D96B00] text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#FFB049]/40"
              >
                <span>{t.heroShopNow}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Notice Card */}
        <div className="bg-[#FFF0D9] border-l-4 border-[#FF8A00] p-3 sm:p-4 rounded-r-xl shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="text-xl" aria-hidden="true">💰</span>
            <div className="text-xs sm:text-sm text-[#35104F] leading-relaxed">
              <strong className="font-bold">{t.noticeHeading}</strong>{' '}
              {t.noticeBody}
            </div>
          </div>
        </div>

        {/* Search & Category Filter Section */}
        <div id="catalog" className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-[#EAD9C5] space-y-3 scroll-mt-20">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#766B7D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchAriaLabel}
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl border border-[#D5C2AF] bg-[#FFFBF5] text-xs sm:text-sm text-[#281735] placeholder-[#8A7C93] focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label={t.clearSearchAriaLabel}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#766B7D] hover:text-[#281735] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips - Smooth horizontal scrolling */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
            {CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.id;
              const label = cat.id === 'all' 
                ? t.allCategories 
                : (lang === 'mr' ? cat.mr : cat.en);
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#35104F] text-[#FFD27A] shadow-sm ring-1 ring-[#FFD27A]'
                      : 'bg-[#FFF0D9] text-[#4A2D0B] hover:bg-[#FFE3BE] border border-[#EAD9C5]'
                  }`}
                >
                  {cat.id === 'all' && <Layers className="w-3.5 h-3.5 shrink-0" />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Counts & Clear Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-[#F3E8DB] text-xs text-[#66566F]">
            <div>
              <span>{filteredProducts.length} {t.productsFound}</span>
              {selectedItems.length > 0 && (
                <span className="ml-2 font-bold text-[#247447]">
                  • {selectedItems.length} {t.selectedItemsCount} ({totalUnits} {t.itemsUnitSuffix})
                </span>
              )}
            </div>

            {selectedItems.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearAll}</span>
              </button>
            )}
          </div>

        </div>

        {/* Product Table / List Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EAD9C5] overflow-hidden">
          
          {/* Responsive Table for Desktop & Tablet */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#35104F] text-[#FFD27A] text-xs font-bold tracking-wider uppercase border-b border-[#EAD9C5]">
                  <th className="py-3 px-4 w-12 text-center">{t.colSr}</th>
                  <th className="py-3 px-4">{t.colProduct}</th>
                  <th className="py-3 px-4">{t.colPacking}</th>
                  <th className="py-3 px-4 text-right">{t.colRate}</th>
                  <th className="py-3 px-4 text-center w-36">{t.colQty}</th>
                  <th className="py-3 px-4 text-right w-28">{t.colTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAD9C5]/50 text-sm">
                {filteredProducts.map((p) => {
                  const numId = Number(p.id);
                  const qty = Number(quantities[numId]) || 0;
                  const unitPrice = Number(p.price) || 0;
                  const lineTotal = unitPrice * qty;
                  const isSelected = qty > 0;

                  return (
                    <tr 
                      key={p.id}
                      className={`transition-colors hover:bg-[#FFF8ED] ${isSelected ? 'bg-[#FFF3E0]/70 font-medium' : ''}`}
                    >
                      <td className="py-3 px-4 text-center text-xs text-[#766B7D] font-mono">
                        {p.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#281735]">
                          {lang === 'mr' ? p.nameMr : p.nameEn}
                        </div>
                        <div className="text-[11px] text-[#766B7D]">
                          {lang === 'mr' ? p.nameEn : p.nameMr}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#66566F]">
                        {lang === 'mr' ? p.unitMr : p.unitEn}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#35104F]">
                        ₹{unitPrice}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 bg-[#FFF8ED] border border-[#D5C2AF] rounded-lg p-0.5 shadow-sm">
                          <button
                            onClick={() => handleQuantityChange(numId, -1)}
                            disabled={qty === 0}
                            className={`w-7 h-7 rounded flex items-center justify-center font-bold text-base transition-colors ${
                              qty > 0 
                                ? 'bg-[#FF8A00] text-white hover:bg-[#E87500] active:scale-95' 
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            aria-label={t.decreaseQtyAria}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <span className="w-8 text-center font-bold text-sm text-[#281735]">
                            {qty}
                          </span>

                          <button
                            onClick={() => handleQuantityChange(numId, 1)}
                            className="w-7 h-7 rounded bg-[#FF8A00] text-white hover:bg-[#E87500] active:scale-95 flex items-center justify-center font-bold text-base transition-colors shadow-sm"
                            aria-label={t.increaseQtyAria}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#FF8A00]">
                        {lineTotal > 0 ? `₹${lineTotal.toLocaleString('en-IN')}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Improved Mobile Optimized Cards List */}
          <div className="block md:hidden divide-y divide-[#EAD9C5]">
            {filteredProducts.map((p) => {
              const numId = Number(p.id);
              const qty = Number(quantities[numId]) || 0;
              const unitPrice = Number(p.price) || 0;
              const lineTotal = unitPrice * qty;
              const isSelected = qty > 0;

              return (
                <div 
                  key={p.id}
                  className={`p-3.5 flex items-center justify-between gap-3 transition-all duration-200 ${
                    isSelected ? 'bg-[#FFF3E0]/80 shadow-xs border-l-4 border-l-[#FF8A00]' : 'bg-white hover:bg-[#FFFDF9]'
                  }`}
                >
                  {/* Left: Product Info with Prominent Price */}
                  <div className="flex-1 min-w-0 pr-1">
                    {/* Header: ID + Name + Price clearly highlighted */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFF0D9] text-[#766B7D] font-bold">
                        #{p.id}
                      </span>
                      <h2 className="font-bold text-sm text-[#281735] leading-snug">
                        {lang === 'mr' ? p.nameMr : p.nameEn}
                      </h2>
                    </div>

                    {/* Secondary Translated Name */}
                    <div className="text-[11px] text-[#766B7D] truncate mt-0.5">
                      {lang === 'mr' ? p.nameEn : p.nameMr}
                    </div>

                    {/* Prominent Price & Secondary Packing Info */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <div className="flex items-baseline gap-1 bg-[#35104F] text-[#FFD27A] px-2 py-0.5 rounded-md font-bold text-xs shadow-xs">
                        <span>₹{unitPrice}</span>
                      </div>
                      
                      <span className="text-[11px] text-[#66566F] bg-[#F4EDE4] px-1.5 py-0.5 rounded">
                        {lang === 'mr' ? p.unitMr : p.unitEn}
                      </span>

                      {lineTotal > 0 && (
                        <span className="text-xs font-black text-[#FF8A00] ml-auto">
                          = ₹{lineTotal.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quantity Stepper with Proper Sizing & Spacing */}
                  <div className="shrink-0 flex items-center bg-[#FFF8ED] border border-[#D5C2AF] rounded-xl p-1 shadow-sm">
                    <button
                      onClick={() => handleQuantityChange(numId, -1)}
                      disabled={qty === 0}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-all ${
                        qty > 0 
                          ? 'bg-[#FF8A00] text-white active:scale-90 shadow-sm' 
                          : 'text-gray-300 cursor-not-allowed bg-transparent'
                      }`}
                      aria-label={t.decreaseQtyAria}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="w-8 text-center font-black text-sm text-[#281735]">
                      {qty}
                    </span>

                    <button
                      onClick={() => handleQuantityChange(numId, 1)}
                      className="w-8 h-8 rounded-lg bg-[#FF8A00] text-white active:scale-90 flex items-center justify-center font-bold transition-all shadow-sm hover:bg-[#E87500]"
                      aria-label={t.increaseQtyAria}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Empty state when no products match filter */}
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <span className="text-3xl" aria-hidden="true">🔍</span>
              <p className="text-sm font-semibold text-[#66566F]">
                {t.noProductsFound}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="text-xs font-bold text-[#FF8A00] underline"
              >
                {t.viewAllProducts}
              </button>
            </div>
          )}

        </div>

        {/* Informative Footer & Local Shop Contact */}
        <footer className="pt-4 pb-2 text-center space-y-1.5 text-xs text-[#766B7D]">
          <p className="font-semibold text-[#35104F]">
            {t.footerShopTag}
          </p>
          <p>
            {t.footerContactText}
          </p>
          <p className="text-[11px] text-[#A294A8]">
            © {new Date().getFullYear()} {t.shopName}. {t.allRightsReserved}
          </p>
        </footer>

      </main>

      {/* Sticky Bottom Order Summary Bar (Always visible on mobile & desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-[#FF8A00] shadow-bottom-nav px-3 sm:px-6 py-2.5 sm:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Left: Summary Figures with Large, Bold Grand Total */}
          <div className="min-w-0 flex-1">
            
            {/* Separate Product Count & Total Units */}
            <div className="flex items-center gap-1.5 text-xs text-[#66566F] font-medium leading-none mb-1">
              <span className="font-bold text-[#35104F] bg-[#FFF0D9] px-1.5 py-0.5 rounded transition-colors duration-150">
                {totalItemCount} {totalItemCount === 1 ? t.bottomItemSingular : t.bottomItemsPlural}
              </span>
              <span>•</span>
              <span className="text-[11px]">
                {totalUnits} {totalUnits === 1 ? t.bottomUnitSingular : t.bottomUnitsPlural}
              </span>
            </div>

            {/* Large Bold Grand Total Display with zero layout shift */}
            <div className="flex items-baseline gap-1 leading-tight">
              <span className="text-[11px] sm:text-xs font-bold text-[#766B7D]">
                {t.bottomGrandTotalLabel}
              </span>
              <span className="text-xl sm:text-3xl font-black text-[#FF8A00] font-cinzel tracking-tight drop-shadow-xs transition-transform duration-150">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Delivery Status Note */}
            <div className="text-[10px] text-[#247447] font-semibold truncate flex items-center gap-1 mt-0.5">
              <Truck className="w-3 h-3 shrink-0" />
              <span>{deliveryArea === 'nashik' ? t.bottomNashikFree : t.bottomOutsideNashik}</span>
            </div>
          </div>

          {/* Right: Prominent WhatsApp Order Button */}
          <button
            type="button"
            onClick={handleOrderClick}
            disabled={selectedItems.length === 0}
            className={`shrink-0 px-4 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-diya transition-all active:scale-95 ${
              selectedItems.length > 0
                ? 'bg-[#25D366] hover:bg-[#20BD5A] text-white cursor-pointer hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span className="text-base sm:text-xl">💬</span>
            <span className="whitespace-nowrap">
              {t.orderOnWhatsAppBtn}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>

        </div>
      </div>

      {/* Review & Customer Delivery Details Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-[#EAD9C5] animate-modal-in overflow-hidden">
            
            {/* Modal Header (Fixed at top of modal) */}
            <div className="shrink-0 bg-[#35104F] text-white px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between border-b border-[#FFB049]/40 z-10">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none" aria-hidden="true">🧾</span>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#FFD27A] leading-tight">
                    {t.modalTitle}
                  </h3>
                  <p className="text-xs text-[#E8D7F5]">
                    {t.shopName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-colors"
                aria-label={t.closeModalAria}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body Form */}
            <form onSubmit={handleFormSubmitAndOpenWhatsApp} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-sm scrollbar-thin">
              
              {/* Delivery Area Selection */}
              <div className="space-y-2">
                <label className="font-bold text-[#35104F] text-xs sm:text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#FF8A00]" />
                  <span>{t.deliveryAreaTitle}</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryArea('nashik')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      deliveryArea === 'nashik'
                        ? 'border-[#247447] bg-[#E8F5EE] text-[#247447] ring-2 ring-[#247447]'
                        : 'border-[#EAD9C5] bg-[#FFF8ED] text-[#66566F] hover:bg-[#FFF0D9]'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${deliveryArea === 'nashik' ? 'text-[#247447]' : 'text-gray-300'}`} />
                    <div>
                      <div className="font-bold text-xs sm:text-sm">{t.deliveryAreaNashikTitle}</div>
                      <div className="text-[11px] sm:text-xs text-[#247447] font-semibold mt-0.5">{t.deliveryAreaNashikSub}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryArea('outside')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      deliveryArea === 'outside'
                        ? 'border-[#FF8A00] bg-[#FFF0D9] text-[#76450A] ring-2 ring-[#FF8A00]'
                        : 'border-[#EAD9C5] bg-[#FFF8ED] text-[#66566F] hover:bg-[#FFF0D9]'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${deliveryArea === 'outside' ? 'text-[#FF8A00]' : 'text-gray-300'}`} />
                    <div>
                      <div className="font-bold text-xs sm:text-sm">{t.deliveryAreaOutsideTitle}</div>
                      <div className="text-[11px] sm:text-xs text-[#76450A] font-semibold mt-0.5">{t.deliveryAreaOutsideSub}</div>
                    </div>
                  </button>
                </div>

                <div className="text-xs sm:text-sm p-2.5 rounded-xl bg-[#F8F3EA] text-[#66566F] leading-snug border border-[#EAD9C5]/50">
                  {deliveryArea === 'nashik' ? t.nashikDeliveryNote : t.outsideDeliveryNote}
                </div>
              </div>

              {/* Customer Inputs (Required: Name, Phone, Address) */}
              <div className="border border-[#EAD9C5] rounded-2xl p-3.5 sm:p-4 bg-[#FFFDF9] space-y-3.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#F0E3D5]">
                  <span className="font-bold text-xs sm:text-sm text-[#35104F] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#FF8A00]" />
                    <span>{t.customerFormTitle}</span>
                  </span>
                  <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-bold">
                    {t.requiredStar} {t.requiredBadge}
                  </span>
                </div>

                {/* Name & Phone Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#493557] block mb-1">
                      {t.nameLabel} <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      placeholder={t.namePlaceholder}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm bg-white text-[#281735] focus:outline-none transition-all ${
                        formErrors.name 
                          ? 'border-red-500 ring-2 ring-red-400 bg-red-50/30' 
                          : 'border-[#D5C2AF] focus:ring-2 focus:ring-[#FF8A00]'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] sm:text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.name}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#493557] block mb-1">
                      {t.phoneLabel} <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      placeholder={t.phonePlaceholder}
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm bg-white text-[#281735] focus:outline-none transition-all ${
                        formErrors.phone 
                          ? 'border-red-500 ring-2 ring-red-400 bg-red-50/30' 
                          : 'border-[#D5C2AF] focus:ring-2 focus:ring-[#FF8A00]'
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="text-[11px] sm:text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Complete Address Field */}
                <div>
                  <label className="text-xs sm:text-sm font-bold text-[#493557] block mb-1">
                    {t.addressLabel} <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => {
                      setCustomerAddress(e.target.value);
                      if (formErrors.address) setFormErrors(prev => ({ ...prev, address: '' }));
                    }}
                    placeholder={t.addressPlaceholder}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm bg-white text-[#281735] focus:outline-none transition-all resize-none ${
                      formErrors.address 
                        ? 'border-red-500 ring-2 ring-red-400 bg-red-50/30' 
                        : 'border-[#D5C2AF] focus:ring-2 focus:ring-[#FF8A00]'
                    }`}
                  />
                  {formErrors.address && (
                    <p className="text-[11px] sm:text-xs text-red-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.address}</span>
                    </p>
                  )}
                </div>

                {/* Optional Landmark */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs sm:text-sm font-semibold text-[#66566F]">
                      {t.landmarkLabel}
                    </label>
                    <span className="text-[11px] text-[#766B7D] bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                      {t.optionalBadge}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customerLandmark}
                    onChange={(e) => setCustomerLandmark(e.target.value)}
                    placeholder={t.landmarkPlaceholder}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C2AF] text-xs sm:text-sm bg-white text-[#281735] focus:outline-none focus:ring-2 focus:ring-[#FF8A00]"
                  />
                </div>

                {/* Improved Geolocation & Drop-Off Pin Section */}
                <div className="pt-2.5 border-t border-[#F0E3D5] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#35104F] flex items-center gap-1.5">
                        <Navigation className="w-4 h-4 text-[#FF8A00]" />
                        <span>{t.locationSectionTitle}</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-[#766B7D] bg-gray-100 px-2 py-0.5 rounded font-medium">
                      {t.optionalBadge}
                    </span>
                  </div>

                  <p className="text-xs text-[#766B7D] leading-snug">
                    {t.locationSectionHelp}
                  </p>

                  {/* Geolocation Buttons */}
                  {!locationCoords ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={locationStatus === 'locating'}
                          className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                            locationStatus === 'locating'
                              ? 'bg-amber-50 border-amber-300 text-amber-800 cursor-wait'
                              : 'bg-[#FFF8ED] hover:bg-[#FFF0D9] border-[#D5C2AF] text-[#35104F] active:scale-98'
                          }`}
                        >
                          {locationStatus === 'locating' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-[#FF8A00]" />
                              <span>{t.locatingStatus}</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-4 h-4 text-[#FF8A00]" />
                              <span>{t.useLocationBtn}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={openMapPicker}
                          className="py-2.5 px-3 rounded-xl border border-[#D5C2AF] bg-white text-[#35104F] hover:bg-[#FFF8ED] text-xs sm:text-sm font-bold flex items-center gap-1.5 active:scale-98"
                          title={t.chooseOnMapBtn}
                        >
                          <MapIcon className="w-4 h-4 text-[#FF8A00]" />
                          <span className="hidden xs:inline">{t.chooseOnMapBtn}</span>
                        </button>
                      </div>

                      {/* Error or Help Notice */}
                      {locationErrorMessage && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5 leading-snug">
                          <div className="flex items-start gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <span>{locationErrorMessage}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                            <button
                              type="button"
                              onClick={handleGetLocation}
                              className="text-xs text-amber-900 font-bold hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[#FF8A00]" />
                              <span>{t.retryLocationBtn}</span>
                            </button>
                            <span className="text-amber-400">•</span>
                            <button
                              type="button"
                              onClick={openMapPicker}
                              className="text-xs text-amber-900 font-bold hover:underline flex items-center gap-1"
                            >
                              <MapIcon className="w-3.5 h-3.5 text-[#FF8A00]" />
                              <span>{t.chooseOnMapBtn}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Captured Location Details with Reported Accuracy Display */
                    <div className="p-3 rounded-xl bg-[#E8F5EE] border border-[#247447]/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-[#247447] flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t.locationSuccess}</span>
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={locationStatus === 'locating'}
                            className="text-xs text-[#35104F] hover:underline font-bold flex items-center gap-1"
                            title={t.retryLocationBtn}
                          >
                            <RefreshCw className={`w-3 h-3 ${locationStatus === 'locating' ? 'animate-spin' : ''}`} />
                            <span>{t.retryLocationBtn}</span>
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={handleClearLocation}
                            className="text-xs text-red-600 hover:text-red-700 font-bold underline"
                          >
                            {t.clearLocationBtn}
                          </button>
                        </div>
                      </div>

                      {/* Coordinates and Actual Accuracy in Metres */}
                      <div className="text-xs text-[#281735] bg-white/90 p-2.5 rounded-lg border border-[#247447]/20 space-y-1.5">
                        <div className="flex items-center justify-between font-mono">
                          <div>
                            <span>{t.latitudeLabel} <strong>{locationCoords.latitude}</strong></span>
                            <span className="mx-1.5">•</span>
                            <span>{t.longitudeLabel} <strong>{locationCoords.longitude}</strong></span>
                          </div>
                          <a
                            href={`https://maps.google.com/?q=${locationCoords.latitude},${locationCoords.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#247447] hover:underline font-bold flex items-center gap-1 ml-1 shrink-0"
                          >
                            <span>{t.viewOnMap}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Reported Accuracy Indicator */}
                        {locationCoords.accuracy && (
                          <div className="flex items-center justify-between pt-1 border-t border-[#247447]/10 text-xs">
                            <span className="text-[#4F5D54]">
                              {t.accuracyReportPrefix}<strong>{locationCoords.accuracy}{t.metersSuffix}</strong>
                            </span>
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              locationCoords.accuracy <= 25 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : locationCoords.accuracy <= 100 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {locationCoords.accuracy <= 25 
                                ? t.accuracyGoodTag 
                                : locationCoords.accuracy <= 100 
                                  ? t.accuracyFairTag 
                                  : t.accuracyPoorTag}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Poor Accuracy Warning Banner */}
                      {locationCoords.accuracy > 100 && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-snug">
                          {t.accuracyPoorWarning.replace('{meters}', locationCoords.accuracy)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Paste Google Maps Location Link */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-[#66566F] flex items-center gap-1 mb-1">
                      <LinkIcon className="w-3.5 h-3.5 text-[#FF8A00]" />
                      <span>{t.mapsLinkOptionTitle}</span>
                    </label>
                    <input
                      type="url"
                      value={customMapsLink}
                      onChange={(e) => {
                        setCustomMapsLink(e.target.value);
                        if (formErrors.customMaps) setFormErrors(prev => ({ ...prev, customMaps: '' }));
                      }}
                      placeholder={t.mapsLinkPlaceholder}
                      className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm bg-white text-[#281735] focus:outline-none transition-all ${
                        formErrors.customMaps 
                          ? 'border-red-500 ring-2 ring-red-400' 
                          : 'border-[#D5C2AF] focus:ring-2 focus:ring-[#FF8A00]'
                      }`}
                    />
                    {formErrors.customMaps && (
                      <p className="text-[11px] sm:text-xs text-red-600 mt-1 font-semibold">
                        {formErrors.customMaps}
                      </p>
                    )}
                  </div>

                </div>

              </div>

              {/* Bill Items Breakdown */}
              <div className="border border-[#EAD9C5] rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-[#FFF0D9] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#35104F] flex justify-between items-center border-b border-[#EAD9C5]">
                  <span>{t.selectedProductsTitle}</span>
                  <span>{t.amountColTitle}</span>
                </div>
                
                <div className="max-h-52 overflow-y-auto divide-y divide-[#EAD9C5]/50 px-3.5 py-1">
                  {selectedItems.map((item, idx) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs sm:text-sm">
                      <div className="pr-2 min-w-0 flex-1">
                        <span className="font-semibold text-[#281735] block truncate">
                          {idx + 1}. {lang === 'mr' ? item.nameMr : item.nameEn}
                        </span>
                        <div className="text-[11px] sm:text-xs text-[#766B7D] mt-0.5">
                          {item.qty} × ₹{item.unitPrice} ({lang === 'mr' ? item.unitMr : item.unitEn})
                        </div>
                      </div>
                      <span className="font-bold text-[#35104F] shrink-0 text-xs sm:text-sm ml-2">
                        ₹{item.lineTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Delivery Total */}
                <div className="bg-[#FFF8ED] px-3.5 py-2.5 border-t border-[#EAD9C5] space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-[#66566F]">
                    <span>{t.subtotalLabel}</span>
                    <span className="font-bold text-[#281735]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[#66566F]">
                    <span>{t.deliveryLabel}</span>
                    <span className="font-bold text-[#247447]">
                      {deliveryArea === 'nashik' ? t.deliveryFreeValue : t.deliveryToConfirmValue}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base font-bold text-[#35104F] pt-1.5 border-t border-[#EAD9C5]">
                    <span>{t.grandTotalLabel}</span>
                    <span className="text-base sm:text-lg text-[#FF8A00] font-cinzel font-black">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Honest Notice about WhatsApp confirmation */}
              <div className="bg-[#FFF8E7] border border-[#FFD27A] p-3 rounded-xl text-xs text-[#5A380A] leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FF8A00] shrink-0 mt-0.5" />
                <div>
                  <strong>{t.disclaimerHeading}</strong> {t.disclaimerText}
                </div>
              </div>

              {/* Bottom spacer so content is never obscured by sticky footer */}
              <div className="h-2"></div>
            </form>

            {/* Sticky Modal Bottom Action Footer with Safe-Area Padding */}
            <div className="shrink-0 bg-white/95 backdrop-blur-md p-3 sm:p-4 border-t border-[#EAD9C5] shadow-lg z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleFormSubmitAndOpenWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-98 transition-all cursor-pointer"
              >
                <span className="text-xl">💬</span>
                <span>{t.openWhatsAppSubmitBtn}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Interactive Map Point Selector Dialog - Above order modal */}
      {showMapPicker && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-[#EAD9C5] flex flex-col animate-modal-in">
            <div className="bg-[#35104F] text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-[#FFB049]/40">
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-[#FFD27A]" />
                <span className="font-bold text-sm sm:text-base text-[#FFD27A]">{t.chooseOnMapBtn}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-colors"
                aria-label={t.closeMapPickerBtn}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-3.5 space-y-3 text-xs">
              <p className="text-[#66566F] leading-tight">
                {t.mapPickerHelp}
              </p>

              {/* Embedded Interactive OpenStreetMap iframe with pin */}
              <div className="relative rounded-xl overflow-hidden border border-[#D5C2AF] h-60 bg-gray-100">
                <iframe
                  title={t.chooseOnMapBtn}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(pickedMapCoords?.lng || 73.7898) - 0.03}%2C${(pickedMapCoords?.lat || 19.9975) - 0.03}%2C${(pickedMapCoords?.lng || 73.7898) + 0.03}%2C${(pickedMapCoords?.lat || 19.9975) + 0.03}&layer=mapnik&marker=${pickedMapCoords?.lat || 19.9975}%2C${pickedMapCoords?.lng || 73.7898}`}
                />
                
                {/* Center Target Indicator */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-8 h-8 -mt-8 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-red-600 fill-red-500 drop-shadow-md animate-bounce" />
                  </div>
                </div>
              </div>

              {/* Picked Coordinates Display */}
              <div className="flex items-center justify-between text-[11px] font-mono bg-[#FFF8ED] p-2 rounded-lg border border-[#D5C2AF]">
                <span>Lat: {pickedMapCoords?.lat.toFixed(5)}</span>
                <span>Lng: {pickedMapCoords?.lng.toFixed(5)}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMapPicker(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-[#D5C2AF] bg-white text-[#66566F] font-bold text-xs hover:bg-gray-50"
                >
                  {t.closeMapPickerBtn}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPickedLocation}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#FF8A00] hover:bg-[#E87500] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.setThisLocationBtn}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
