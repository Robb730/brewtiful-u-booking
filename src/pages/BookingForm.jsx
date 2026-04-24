import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";

// ─── Mock supabase for preview ───────────────────────────────────────────────


// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HOURS  = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINS   = ["00","15","30","45"];
const AMPM   = ["AM","PM"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Custom Date Picker ───────────────────────────────────────────────────────
function DatePicker({ value, onChange }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const parsed = value ? new Date(value + "T00:00:00") : null;
  const selYear  = parsed?.getFullYear();
  const selMonth = parsed?.getMonth();
  const selDay   = parsed?.getDate();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDOW    = new Date(viewYear, viewMonth, 1).getDay();
  const cells = Array.from({ length: firstDOW }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const pick = (day) => {
    if (!day) return;
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#ecddd6] overflow-hidden select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5ebe5]">
        <button type="button" onClick={prevMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#b89890] hover:bg-[#fdf0ea] hover:text-[#7a5a50] transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <span className="text-sm font-bold text-[#4a3028]">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#b89890] hover:bg-[#fdf0ea] hover:text-[#7a5a50] transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 pt-2 pb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-[#d4b8b0] py-1">{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isToday   = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isSelected = day === selDay && viewMonth === selMonth && viewYear === selYear;
          const isPast    = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <button
              key={day}
              type="button"
              disabled={isPast}
              onClick={() => pick(day)}
              className={`
                aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all active:scale-95
                ${isSelected ? "bg-[#c9a96e] text-white shadow-md shadow-[#c9a96e]/30" :
                  isToday    ? "border-2 border-[#c9a96e]/50 text-[#c9a96e]" :
                  isPast     ? "text-[#e0cccc] cursor-not-allowed" :
                               "text-[#4a3028] hover:bg-[#fdf0ea] hover:text-[#a07840]"}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Selected display */}
      {value && (
        <div className="mx-3 mb-3 px-4 py-3 bg-[#fdf8f5] rounded-xl border border-[#f0ddd5] flex items-center gap-2">
          <svg className="w-4 h-4 text-[#c9a96e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span className="text-sm font-semibold text-[#4a3028]">
            {parsed?.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Custom Time Picker ───────────────────────────────────────────────────────
function TimePicker({ value, onChange }) {
  const hours = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const mins  = ['00','05','10','15','20','25','30','35','40','45','50','55'];

  // Parse existing value (24h "HH:MM") into picker state
  const parseValue = (v) => {
    if (!v) return { hIdx: 0, mIdx: 0, ampm: 'AM' };
    const [hh, mm] = v.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12  = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    const hIdx = hours.indexOf(String(h12).padStart(2, '0'));
    const mIdx = mins.indexOf(String(mm).padStart(2, '0'));
    return { hIdx: hIdx < 0 ? 0 : hIdx, mIdx: mIdx < 0 ? 0 : mIdx, ampm };
  };

  const init = parseValue(value);
  const [hIdx, setHIdx] = useState(init.hIdx);
  const [mIdx, setMIdx] = useState(init.mIdx);
  const [ampm, setAmpm] = useState(init.ampm);

  const hrRef = useRef(null);
  const mnRef = useRef(null);

  // Emit 24h value upward
  const emit = (h, m, ap) => {
    const h12 = parseInt(hours[h], 10);
    let h24 = ap === 'AM' ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
    onChange(`${String(h24).padStart(2,'0')}:${mins[m]}`);
  };

  // Scroll a column and wire snap-scroll listener
  const setupCol = (ref, idx, setter, isHour) => {
    if (!ref.current) return;
    const el = ref.current;
    el.scrollTop = idx * 60;
    const handler = () => {
      clearTimeout(el._t);
      el._t = setTimeout(() => {
        const i = Math.round(el.scrollTop / 60);
        if (i === el._last) return;
        el._last = i;
        el.scrollTo({ top: i * 60, behavior: 'smooth' });
        setter(i);
        if (isHour) emit(i, mIdx, ampm);
        else        emit(hIdx, i, ampm);
      }, 80);
    };
    el.removeEventListener('scroll', el._handler);
    el._handler = handler;
    el.addEventListener('scroll', handler);
    el._last = idx;
  };

  useEffect(() => { setupCol(hrRef, hIdx, setHIdx, true);  }, []);
  useEffect(() => { setupCol(mnRef, mIdx, setMIdx, false); }, []);

  const handleAmpm = (ap) => {
    setAmpm(ap);
    emit(hIdx, mIdx, ap);
  };

  const h12 = hours[hIdx];
  const mm  = mins[mIdx];

  const colStyle = {
    height: 180, width: 72, overflowY: 'scroll', scrollSnapType: 'y mandatory',
    scrollbarWidth: 'none', borderRadius: 16, border: '1px solid #ecddd6',
    background: '#fdf8f5', position: 'relative',
  };
  const itemStyle = (sel) => ({
    height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
    scrollSnapAlign: 'center', fontSize: 22, fontWeight: 700,
    color: sel ? '#4a3028' : '#b89890', cursor: 'pointer', userSelect: 'none',
  });
  const selBarStyle = {
    position: 'absolute', top: '50%', left: 8, right: 8, height: 60,
    transform: 'translateY(-50%)', borderRadius: 12,
    background: '#c9a96e18', border: '1.5px solid #c9a96e55',
    pointerEvents: 'none', zIndex: 2,
  };

  return (
    <div className="bg-white rounded-2xl border border-[#ecddd6] p-4">
      <p className="text-[10px] font-bold text-[#d4b8b0] uppercase tracking-wider mb-4">Select time</p>

      <div className="flex gap-2 justify-center items-center">
        {/* Hour column */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#d4b8b0] uppercase tracking-wider">Hour</span>
          <div style={{ position: 'relative' }}>
            <div style={selBarStyle} />
            <div ref={hrRef} style={colStyle}>
              <div style={{ height: 60 }} />
              {hours.map((h, i) => (
                <div key={h} style={itemStyle(i === hIdx)}
                  onClick={() => { hrRef.current.scrollTo({ top: i*60, behavior:'smooth' }); setHIdx(i); emit(i, mIdx, ampm); }}>
                  {h}
                </div>
              ))}
              <div style={{ height: 60 }} />
            </div>
          </div>
        </div>

        <span className="text-3xl font-bold text-[#c9a96e] mt-5">:</span>

        {/* Minute column */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold text-[#d4b8b0] uppercase tracking-wider">Min</span>
          <div style={{ position: 'relative' }}>
            <div style={selBarStyle} />
            <div ref={mnRef} style={colStyle}>
              <div style={{ height: 60 }} />
              {mins.map((m, i) => (
                <div key={m} style={itemStyle(i === mIdx)}
                  onClick={() => { mnRef.current.scrollTo({ top: i*60, behavior:'smooth' }); setMIdx(i); emit(hIdx, i, ampm); }}>
                  {m}
                </div>
              ))}
              <div style={{ height: 60 }} />
            </div>
          </div>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col gap-1.5 mt-5">
          {['AM','PM'].map(ap => (
            <button key={ap} type="button" onClick={() => handleAmpm(ap)}
              className={`w-14 h-14 rounded-xl text-sm font-bold transition-all border-2 ${
                ampm === ap
                  ? 'bg-[#c9a96e] border-[#c9a96e] text-white'
                  : 'bg-[#fdf8f5] border-[#ecddd6] text-[#b89890] hover:border-[#c9a96e]/50'
              }`}>
              {ap}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {value && (
        <div className="mt-4 px-4 py-3 bg-[#fdf8f5] rounded-xl border border-[#f0ddd5] flex items-center gap-2">
          <svg className="w-4 h-4 text-[#c9a96e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span className="text-sm font-semibold text-[#4a3028]">{h12}:{mm} {ampm}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main BookingForm ─────────────────────────────────────────────────────────
export default function BookingForm({ onSuccess, onCancel }) {
  const [grouped, setGrouped]                     = useState({});
  const [selectedServices, setSelectedServices]   = useState([]);
  const [openCategory, setOpenCategory]           = useState(null);
  const [optionPicker, setOptionPicker]           = useState(null);
  const [loading, setLoading]                     = useState(false);
  const [servicesLoading, setServicesLoading]     = useState(true);
  const [toast, setToast]                         = useState(null);
  const [serviceSearch, setServiceSearch]         = useState("");

  const [customerMode, setCustomerMode]                 = useState(null);
  const [newCustomerConfirmed, setNewCustomerConfirmed] = useState(false);
  const [customers, setCustomers]                       = useState([]);
  const [customersLoading, setCustomersLoading]         = useState(false);
  const [customerSearch, setCustomerSearch]             = useState("");
  const [selectedCustomer, setSelectedCustomer]         = useState(null);
  const searchRef = useRef(null);

  const [form, setForm] = useState({
    customer_name:  "",
    contact_number: "",
    booking_date:   "",
    booking_time:   "",
    notes:          "",
    status:         "pending",
  });

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, options")
        .order("category")
        .order("name");
      if (!error && data) {
        const g = data.reduce((acc, s) => {
          if (!acc[s.category]) acc[s.category] = [];
          acc[s.category].push(s);
          return acc;
        }, {});
        setGrouped(g);
      }
      setServicesLoading(false);
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (customerMode !== "existing") return;
    const fetchCustomers = async () => {
      setCustomersLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone")
        .order("name");
      if (!error && data) setCustomers(data);
      setCustomersLoading(false);
      setTimeout(() => searchRef.current?.focus(), 100);
    };
    fetchCustomers();
  }, [customerMode]);

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setForm(f => ({ ...f, customer_name: c.name, contact_number: c.phone || "" }));
    setCustomerSearch("");
  };

  const resetCustomer = () => {
    setSelectedCustomer(null);
    setCustomerMode(null);
    setNewCustomerConfirmed(false);
    setCustomerSearch("");
    setForm(f => ({ ...f, customer_name: "", contact_number: "" }));
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleServiceTap = (service) => {
    const options = Array.isArray(service.options) ? service.options : [];
    if (options.length === 1) {
      setSelectedServices(prev => [...prev, {
        instance_id:   crypto.randomUUID(),
        service_id:    service.id,
        service_name:  service.name,
        option_label:  options[0].label,
        option_price:  options[0].price,
      }]);
    } else if (options.length > 1) {
      setOptionPicker(service);
    }
  };

  const pickOption = (service, option) => {
    setSelectedServices(prev => [...prev, {
      instance_id:   crypto.randomUUID(),
      service_id:    service.id,
      service_name:  service.name,
      option_label:  option.label,
      option_price:  option.price,
    }]);
    setOptionPicker(null);
  };

  const removeSelected = (instance_id) =>
    setSelectedServices(prev => prev.filter(s => s.instance_id !== instance_id));

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim())  return showToast("error", "Please select a customer.");
    if (selectedServices.length === 0) return showToast("error", "Select at least one service.");
    setLoading(true);

    let customerId = selectedCustomer?.id || null;
    if (customerMode === "new" && form.customer_name.trim()) {
      const { data: newCust, error: custError } = await supabase
        .from("customers")
        .insert([{ name: form.customer_name.trim(), phone: form.contact_number.trim() || null }])
        .select("id, name, phone");
      if (custError) { showToast("error", "Failed to save customer: " + custError.message); setLoading(false); return; }
      if (!newCust || newCust.length === 0 || !newCust[0].id) { showToast("error", "Customer was saved but ID could not be retrieved."); setLoading(false); return; }
      customerId = newCust[0].id;
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        customer_name:  form.customer_name.trim(),
        contact_number: form.contact_number.trim(),
        customer_id:    customerId,
        booking_date:   form.booking_date,
        booking_time:   form.booking_time,
        notes:          form.notes,
        status:         form.status,
      }])
      .select()
      .single();

    if (bookingError) { showToast("error", "Failed to save: " + bookingError.message); setLoading(false); return; }

    const { error: servicesError } = await supabase
      .from("booking_services")
      .insert(selectedServices.map(s => ({
        booking_id:   booking.id,
        service_id:   s.service_id,
        service_name: s.service_name,
        option_label: s.option_label,
        option_price: s.option_price,
      })));

    if (servicesError) { showToast("error", "Booking saved but services failed: " + servicesError.message); setLoading(false); return; }

    showToast("success", "Booking saved!");
    setLoading(false);
    setTimeout(() => onSuccess?.(), 900);
  };

  const totalPrice  = selectedServices.reduce((sum, s) => sum + (s.option_price || 0), 0);
  const customerDone = selectedCustomer !== null || (customerMode === "new" && newCustomerConfirmed);
  const step1Done   = customerDone;
  const step2Done   = form.booking_date && form.booking_time;
  const step3Done   = selectedServices.length > 0;

  const inputBase =
    "w-full bg-white border border-[#ecddd6] rounded-2xl px-4 py-4 text-base text-[#4a3028] placeholder-[#d4b8b0] focus:outline-none focus:border-[#c9a96e] focus:ring-4 focus:ring-[#c9a96e]/10 transition-all min-h-[52px]";

  return (
    <div className="min-h-screen bg-[#fdf8f5]">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-28 left-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-medium border shadow-2xl sm:top-4 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-sm ${
          toast.type === "success"
            ? "bg-white text-emerald-700 border-emerald-200 shadow-emerald-100"
            : "bg-white text-rose-600  border-rose-200  shadow-rose-100"
        }`}>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
            toast.type === "success" ? "bg-emerald-100" : "bg-rose-100"
          }`}>
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          {toast.message}
        </div>
      )}

      {/* ── Option Picker Sheet ── */}
      {optionPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOptionPicker(null)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[#e8d5cc] rounded-full" />
            </div>
            <div className="px-6 pt-3 pb-3 border-b border-[#f5e8e2]">
              <h4 className="text-lg font-bold text-[#4a3028]">{optionPicker.name}</h4>
              <p className="text-sm text-[#c4a99f] mt-0.5">Choose a variant</p>
            </div>
            <div className="px-4 py-3 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {(optionPicker.options || []).map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => pickOption(optionPicker, opt)}
                  className="w-full flex items-center justify-between px-5 py-5 rounded-2xl border border-[#f0ddd5] hover:border-[#c9a96e]/50 hover:bg-[#fdf0ea] active:scale-[0.98] transition-all text-left min-h-[64px]"
                >
                  <span className="text-base text-[#4a3028] font-semibold">{opt.label}</span>
                  <span className="text-base font-bold text-[#c9a96e]">₱{opt.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="px-4 pt-2 pb-4">
              <button
                type="button"
                onClick={() => setOptionPicker(null)}
                className="w-full py-4 rounded-2xl bg-[#fdf0ea] text-base text-[#b89890] font-semibold hover:text-[#7a5a50] transition-all min-h-[56px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="sticky top-0 z-30 bg-[#fdf8f5]/95 backdrop-blur-sm border-b border-[#f0ddd5]">
        <div
          className="max-w-2xl mx-auto px-4 flex items-center gap-3"
          style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}
        >
          <div className="pb-4 flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-[#ecddd6] text-[#b89890] hover:text-[#5a3e36] hover:border-[#d4b8b0] transition-all flex-shrink-0 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-[#4a3028] leading-tight">New Booking</h1>
              <p className="text-xs text-[#c4a99f]">Fill in the appointment details</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {[step1Done, step2Done, step3Done].map((done, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${done ? "w-6 h-2.5 bg-[#c9a96e]" : "w-2.5 h-2.5 bg-[#e8d5cc]"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit}>
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-36">

          {/* STEP 1: Customer */}
          <Section number="1" title="Customer" done={step1Done}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
          >
            {customerDone ? (
              <div className="flex items-center justify-between p-4 bg-[#fdf0ea] rounded-2xl border border-[#e8d5cc]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#d4b97e] flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-base font-bold text-white">{form.customer_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#4a3028] truncate">{form.customer_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                        customerMode === "existing" ? "bg-sky-50 text-sky-500 border-sky-200" : "bg-violet-50 text-violet-500 border-violet-200"
                      }`}>
                        {customerMode === "existing" ? "Existing" : "New"}
                      </span>
                    </div>
                    {form.contact_number && form.contact_number !== "00" && (
                      <p className="text-sm text-[#b89890] mt-0.5">{form.contact_number}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetCustomer}
                  className="text-sm text-[#c4a99f] hover:text-[#7a5a50] transition-all px-4 py-3 rounded-xl border border-[#e8d5cc] bg-white hover:border-[#d4b8b0] flex-shrink-0 ml-2 min-h-[44px] font-medium"
                >
                  Change
                </button>
              </div>
            ) : customerMode === null ? (
              <div>
                <p className="text-sm text-[#b89890] mb-4">Is this customer in the system?</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { mode: "existing", emoji: "👤", label: "Yes, existing", sub: "Search database" },
                    { mode: "new",      emoji: "✨", label: "No, new",        sub: "Enter manually"  },
                  ].map(({ mode, emoji, label, sub }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCustomerMode(mode)}
                      className="py-6 rounded-2xl border-2 border-[#ecddd6] hover:border-[#c9a96e]/50 hover:bg-[#fdf0ea] active:scale-[0.97] transition-all text-center min-h-[120px]"
                    >
                      <div className="text-3xl mb-2.5">{emoji}</div>
                      <div className="text-sm font-bold text-[#4a3028]">{label}</div>
                      <div className="text-xs text-[#c4a99f] mt-1">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : customerMode === "existing" ? (
              <div>
                <div className="relative mb-3">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#d4b8b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    ref={searchRef}
                    type="search"
                    inputMode="search"
                    placeholder="Search by name or phone…"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className={inputBase + " pl-12"}
                  />
                </div>
                {customersLoading ? (
                  <div className="text-center py-8 text-[#d4b8b0] text-sm">Loading…</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#ecddd6] divide-y divide-[#f5e8e2] bg-white">
                    {filteredCustomers.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[#c4a99f]">No customers found</div>
                    ) : filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full flex items-center justify-between px-4 py-4 hover:bg-[#fdf8f5] active:bg-[#fdf0ea] transition-all text-left min-h-[60px]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#fdf0ea] flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[#c9a96e]">{c.name?.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm text-[#4a3028] font-semibold">{c.name}</span>
                        </div>
                        {c.phone && c.phone !== "00" && (
                          <span className="text-xs text-[#c4a99f]">{c.phone}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setCustomerMode(null)}
                  className="mt-4 flex items-center gap-1.5 text-sm text-[#c4a99f] hover:text-[#7a5a50] transition-all py-2 min-h-[44px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                  </svg>
                  Back
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#b89890] mb-2 font-semibold">Full Name *</label>
                  <input
                    name="customer_name"
                    value={form.customer_name}
                    onChange={handleChange}
                    placeholder="e.g. Maria Santos"
                    className={inputBase}
                    autoComplete="name"
                    autoCapitalize="words"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#b89890] mb-2 font-semibold">Contact Number</label>
                  <input
                    name="contact_number"
                    value={form.contact_number}
                    onChange={handleChange}
                    placeholder="e.g. 09XX XXX XXXX"
                    className={inputBase}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (form.customer_name.trim()) setNewCustomerConfirmed(true);
                    else showToast("error", "Please enter the customer's name.");
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#c9a96e] to-[#d4b97e] text-white text-base font-bold hover:from-[#d4b97e] hover:to-[#e0c98e] transition-all shadow-md shadow-[#c9a96e]/20 active:scale-[0.98] min-h-[56px]"
                >
                  Confirm Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode(null)}
                  className="flex items-center gap-1.5 text-sm text-[#c4a99f] hover:text-[#7a5a50] transition-all py-2 min-h-[44px]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                  </svg>
                  Back
                </button>
              </div>
            )}
          </Section>

          {/* ── STEP 2: Date & Time — custom pickers ── */}
          <Section
            number="2"
            title="Date & Time"
            done={step2Done}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
          >
            {/* Sub-tabs */}
            <DateTimeTabs
              bookingDate={form.booking_date}
              bookingTime={form.booking_time}
              onDateChange={v => setForm(f => ({ ...f, booking_date: v }))}
              onTimeChange={v => setForm(f => ({ ...f, booking_time: v }))}
            />
          </Section>

          {/* STEP 3: Services */}
          <Section
            number="3"
            title="Services"
            done={step3Done}
            badge={selectedServices.length > 0 ? `${selectedServices.length} · ₱${totalPrice.toLocaleString()}` : null}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>}
          >
            {selectedServices.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-[#fdf0ea] rounded-2xl border border-[#e8d5cc]">
                {selectedServices.map(s => (
                  <button
                    key={s.instance_id}
                    type="button"
                    onClick={() => removeSelected(s.instance_id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e8d5cc] text-[#a07840] rounded-xl text-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 active:scale-[0.97] transition-all min-h-[40px]"
                  >
                    <span className="font-semibold">{s.service_name}</span>
                    {s.option_label !== "Default" && <span className="text-[#c9a96e]/70">· {s.option_label}</span>}
                    <span className="text-[#c9a96e] font-bold">₱{s.option_price?.toLocaleString()}</span>
                    <span className="text-[#bbb] ml-0.5 text-base leading-none">×</span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative mb-3">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#d4b8b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="search"
                inputMode="search"
                placeholder="Search services…"
                value={serviceSearch}
                onChange={e => { setServiceSearch(e.target.value); setOpenCategory(e.target.value ? "__all__" : null); }}
                className={inputBase + " pl-12 pr-12"}
              />
              {serviceSearch && (
                <button
                  type="button"
                  onClick={() => { setServiceSearch(""); setOpenCategory(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#e8d5cc] text-[#b89890] hover:bg-[#d4b8b0] hover:text-white flex items-center justify-center text-base transition-all"
                >×</button>
              )}
            </div>

            {servicesLoading ? (
              <div className="text-center py-12 text-[#d4b8b0] text-sm">Loading services…</div>
            ) : (() => {
              const query = serviceSearch.toLowerCase();
              const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, items]) => {
                const matched = query ? items.filter(s => s.name.toLowerCase().includes(query)) : items;
                if (matched.length > 0) acc[cat] = matched;
                return acc;
              }, {});
              const entries = Object.entries(filteredGrouped);

              if (entries.length === 0) return (
                <div className="text-center py-10 text-[#c4a99f] text-sm border border-[#f0ddd5] rounded-2xl">
                  <div className="text-3xl mb-2">🔍</div>
                  No services match "{serviceSearch}"
                </div>
              );

              return (
                <div className="rounded-2xl border border-[#ecddd6] overflow-hidden bg-white">
                  {entries.map(([category, items], i) => {
                    const instancesInCat = selectedServices.filter(sel => items.some(item => item.id === sel.service_id)).length;
                    const isOpen = serviceSearch ? true : openCategory === category;
                    return (
                      <div key={category} className={i > 0 ? "border-t border-[#f5e8e2]" : ""}>
                        <button
                          type="button"
                          onClick={() => !serviceSearch && setOpenCategory(openCategory === category ? null : category)}
                          className={`w-full flex items-center justify-between px-4 py-4 transition-all text-left min-h-[56px] ${!serviceSearch ? "hover:bg-[#fdf8f5] active:bg-[#fdf0ea]" : "cursor-default"}`}
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-sm font-bold text-[#4a3028]">{category}</span>
                            <span className="text-xs text-[#d4b8b0] bg-[#fdf0ea] px-2 py-0.5 rounded-md">{items.length}</span>
                            {instancesInCat > 0 && (
                              <span className="text-xs bg-[#c9a96e]/15 text-[#a07840] px-2.5 py-1 rounded-full font-bold">
                                {instancesInCat} ✓
                              </span>
                            )}
                          </div>
                          {!serviceSearch && (
                            <svg className={`w-5 h-5 text-[#d4b8b0] transition-transform duration-200 flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                            </svg>
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 space-y-2 bg-[#fdf8f5] border-t border-[#f5e8e2]">
                            {items.map(service => {
                              const serviceInstances = selectedServices.filter(s => s.service_id === service.id);
                              const isSelected = serviceInstances.length > 0;
                              const options = Array.isArray(service.options) ? service.options : [];
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => handleServiceTap(service)}
                                  className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-left transition-all border active:scale-[0.98] min-h-[56px] ${
                                    isSelected ? "bg-[#c9a96e]/10 border-[#c9a96e]/40" : "bg-white border-[#ecddd6] hover:border-[#c9a96e]/40 hover:bg-[#fdf0ea]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${
                                      isSelected ? "bg-[#c9a96e] text-white" : "bg-[#f5e8e2] text-[#d4b8b0]"
                                    }`}>
                                      {isSelected ? (serviceInstances.length > 1 ? serviceInstances.length : "✓") : "+"}
                                    </div>
                                    <div className="min-w-0">
                                      <span className={`text-sm font-semibold truncate block ${isSelected ? "text-[#a07840]" : "text-[#4a3028]"}`}>
                                        {service.name}
                                      </span>
                                      {isSelected && serviceInstances[serviceInstances.length - 1].option_label !== "Default" && (
                                        <span className="text-xs text-[#c9a96e]/80 block">
                                          {serviceInstances[serviceInstances.length - 1].option_label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    {options.length > 1 && !isSelected && (
                                      <span className="text-xs text-[#c4a99f] bg-[#fdf0ea] px-1.5 py-0.5 rounded">{options.length} opts</span>
                                    )}
                                    <span className={`text-sm font-bold ${isSelected ? "text-[#c9a96e]" : "text-[#c4a99f]"}`}>
                                      {isSelected
                                        ? `₱${serviceInstances[serviceInstances.length - 1].option_price?.toLocaleString()}`
                                        : options.length === 1 ? `₱${options[0].price.toLocaleString()}` : null}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Section>

          {/* STEP 4: Notes */}
          <Section
            number="4"
            title="Notes"
            optional
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>}
          >
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              placeholder="Paste notes from Facebook chat here…"
              className={inputBase + " resize-none leading-relaxed"}
            />
          </Section>
        </div>

        {/* ── Sticky Footer ── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-[#ecddd6] px-4 pt-4"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <div className="max-w-2xl mx-auto">
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm text-[#c4a99f]">{selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""}</span>
                <span className="text-base font-bold text-[#c9a96e]">₱{totalPrice.toLocaleString()}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 rounded-2xl text-base text-[#b89890] border border-[#ecddd6] bg-white hover:bg-[#fdf8f5] hover:border-[#d4b8b0] transition-all font-semibold min-h-[56px] active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-[#c9a96e] to-[#d4b97e] text-white hover:from-[#d4b97e] hover:to-[#e0c98e] shadow-lg shadow-[#c9a96e]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 min-h-[56px]"
              >
                {loading ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</>
                ) : (
                  <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Save Booking</>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Date+Time Tab Switcher ───────────────────────────────────────────────────
function DateTimeTabs({ bookingDate, bookingTime, onDateChange, onTimeChange }) {
  const [tab, setTab] = useState("date");
  const dateDone = !!bookingDate;
  const timeDone = !!bookingTime;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 mb-4 p-1 bg-[#fdf0ea] rounded-2xl">
        {[
          { key: "date", label: "📅 Date", done: dateDone },
          { key: "time", label: "🕐 Time", done: timeDone },
        ].map(({ key, label, done }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`
              flex-1 py-3 rounded-xl text-sm font-bold transition-all relative
              ${tab === key
                ? "bg-white text-[#4a3028] shadow-sm border border-[#ecddd6]"
                : "text-[#b89890] hover:text-[#7a5a50]"}
            `}
          >
            {label}
            {done && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#c9a96e] text-white text-[9px]">✓</span>
            )}
          </button>
        ))}
      </div>

      {tab === "date" ? (
        <div>
          <DatePicker value={bookingDate} onChange={onDateChange} />
          {dateDone && (
            <button
              type="button"
              onClick={() => setTab("time")}
              className="mt-3 w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#c9a96e] to-[#d4b97e] text-white text-sm font-bold hover:from-[#d4b97e] hover:to-[#e0c98e] transition-all shadow-md shadow-[#c9a96e]/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Next: Pick a time
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>
      ) : (
        <TimePicker value={bookingTime} onChange={onTimeChange} />
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Section({ number, title, children, done, badge, optional, icon }) {
  return (
    <div className={`bg-white rounded-3xl border overflow-hidden shadow-sm transition-all ${done ? "border-[#e8d5cc]" : "border-[#ecddd6]"}`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b min-h-[60px] ${done ? "border-[#f0e0d8] bg-gradient-to-r from-[#fdf8f5] to-white" : "border-[#f5ebe5] bg-white"}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          done ? "bg-[#c9a96e] text-white shadow-sm shadow-[#c9a96e]/30" : "bg-[#fdf0ea] text-[#d4b8b0] border border-[#ecddd6]"
        }`}>
          {done ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <span className="text-xs font-bold">{number}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-sm font-bold ${done ? "text-[#4a3028]" : "text-[#7a5a50]"}`}>{title}</span>
          {optional && <span className="text-[10px] text-[#d4b8b0] bg-[#fdf0ea] px-1.5 py-0.5 rounded-md">optional</span>}
          {badge && (
            <span className="text-xs bg-[#c9a96e]/12 text-[#a07840] px-2.5 py-1 rounded-full font-bold border border-[#c9a96e]/20 ml-auto flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}