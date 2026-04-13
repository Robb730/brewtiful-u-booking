import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";

export default function BookingForm({ onSuccess, onCancel }) {
  const [grouped, setGrouped] = useState({});
  const [selectedServices, setSelectedServices] = useState([]);
  const [openCategory, setOpenCategory] = useState(null);
  const [optionPicker, setOptionPicker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [serviceSearch, setServiceSearch] = useState("");

  // ── Customer state ──
  const [customerMode, setCustomerMode] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const searchRef = useRef(null);

  const [form, setForm] = useState({
    customer_name: "",
    contact_number: "",
    booking_date: "",
    booking_time: "",
    notes: "",
    status: "pending",
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

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch),
  );

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setForm((f) => ({ ...f, customer_name: c.name, contact_number: c.phone || "" }));
    setCustomerSearch("");
  };

  const resetCustomer = () => {
    setSelectedCustomer(null);
    setCustomerMode(null);
    setCustomerSearch("");
    setForm((f) => ({ ...f, customer_name: "", contact_number: "" }));
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleServiceTap = (service) => {
    const options = Array.isArray(service.options) ? service.options : [];
    if (options.length === 1) {
      setSelectedServices((prev) => [
        ...prev,
        {
          instance_id: crypto.randomUUID(),
          service_id: service.id,
          service_name: service.name,
          option_label: options[0].label,
          option_price: options[0].price,
        },
      ]);
    } else if (options.length > 1) {
      setOptionPicker(service);
    }
  };

  const pickOption = (service, option) => {
    setSelectedServices((prev) => [
      ...prev,
      {
        instance_id: crypto.randomUUID(),
        service_id: service.id,
        service_name: service.name,
        option_label: option.label,
        option_price: option.price,
      },
    ]);
    setOptionPicker(null);
  };

  const removeSelected = (instance_id) =>
    setSelectedServices((prev) => prev.filter((s) => s.instance_id !== instance_id));

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return showToast("error", "Please select a customer.");
    if (selectedServices.length === 0) return showToast("error", "Select at least one service.");
    setLoading(true);

    let customerId = selectedCustomer?.id || null;
    if (customerMode === "new" && form.customer_name.trim()) {
      const { data: newCust, error: custError } = await supabase
        .from("customers")
        .insert([{ name: form.customer_name.trim(), phone: form.contact_number.trim() || null }])
        .select()
        .single();
      if (custError) {
        showToast("error", "Failed to save customer: " + custError.message);
        setLoading(false);
        return;
      }
      customerId = newCust.id;
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        customer_name: form.customer_name.trim(),
        contact_number: form.contact_number.trim(),
        customer_id: customerId,
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        notes: form.notes,
        status: form.status,
      }])
      .select()
      .single();

    if (bookingError) {
      showToast("error", "Failed to save: " + bookingError.message);
      setLoading(false);
      return;
    }

    const { error: servicesError } = await supabase
      .from("booking_services")
      .insert(selectedServices.map((s) => ({
        booking_id: booking.id,
        service_id: s.service_id,
        service_name: s.service_name,
        option_label: s.option_label,
        option_price: s.option_price,
      })));

    if (servicesError) {
      showToast("error", "Booking saved but services failed: " + servicesError.message);
      setLoading(false);
      return;
    }

    showToast("success", "Booking saved!");
    setLoading(false);
    setTimeout(() => onSuccess(), 900);
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.option_price || 0), 0);
  const customerDone = selectedCustomer !== null || (customerMode === "new" && form.customer_name.trim());

  const inputBase =
    "w-full bg-white border border-[#ecddd6] rounded-2xl px-4 py-3.5 text-sm text-[#4a3028] placeholder-[#d4b8b0] focus:outline-none focus:border-[#c9a96e] focus:ring-4 focus:ring-[#c9a96e]/8 transition-all";

  // Step completion checks for progress indicator
  const step1Done = customerDone;
  const step2Done = form.booking_date && form.booking_time;
  const step3Done = selectedServices.length > 0;

  return (
    <div className="min-h-screen bg-[#fdf8f5]">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-medium border shadow-xl transition-all ${
          toast.type === "success"
            ? "bg-white text-emerald-700 border-emerald-200 shadow-emerald-100"
            : "bg-white text-rose-600 border-rose-200 shadow-rose-100"
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
            toast.type === "success" ? "bg-emerald-100" : "bg-rose-100"
          }`}>
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          {toast.message}
        </div>
      )}

      {/* ── Option Picker Modal ── */}
      {optionPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setOptionPicker(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#f0ddd5] shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-[#e8d5cc] rounded-full" />
            </div>
            <div className="px-6 pt-4 pb-2">
              <h4 className="text-base font-semibold text-[#4a3028]">{optionPicker.name}</h4>
              <p className="text-xs text-[#c4a99f] mt-0.5">Choose a variant</p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {(optionPicker.options || []).map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => pickOption(optionPicker, opt)}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-2xl border border-[#f0ddd5] hover:border-[#c9a96e]/50 hover:bg-[#fdf0ea] active:scale-[0.98] transition-all text-left"
                >
                  <span className="text-sm text-[#4a3028] font-medium">{opt.label}</span>
                  <span className="text-sm font-bold text-[#c9a96e]">₱{opt.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <div className="px-4 pb-5">
              <button
                type="button"
                onClick={() => setOptionPicker(null)}
                className="w-full py-3 rounded-2xl bg-[#fdf0ea] text-sm text-[#b89890] font-medium hover:text-[#7a5a50] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="sticky top-0 z-30 bg-[#fdf8f5]/95 backdrop-blur-sm border-b border-[#f0ddd5]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#ecddd6] text-[#b89890] hover:text-[#5a3e36] hover:border-[#d4b8b0] transition-all flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[#4a3028] leading-tight">New Booking</h1>
            <p className="text-[11px] text-[#c4a99f]">Fill in the appointment details</p>
          </div>
          {/* Mini progress dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {[step1Done, step2Done, step3Done].map((done, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${done ? "bg-[#c9a96e]" : "bg-[#e8d5cc]"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Form Body ── */}
      <form onSubmit={handleSubmit}>
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-32">

          {/* ── STEP 1: Customer ── */}
          <Section
            number="1"
            title="Customer"
            done={step1Done}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            {customerDone ? (
              <div className="flex items-center justify-between p-4 bg-[#fdf0ea] rounded-2xl border border-[#e8d5cc]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a96e] to-[#d4b97e] flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-sm font-bold text-white">{form.customer_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#4a3028] truncate">{form.customer_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                        customerMode === "existing"
                          ? "bg-sky-50 text-sky-500 border-sky-200"
                          : "bg-violet-50 text-violet-500 border-violet-200"
                      }`}>
                        {customerMode === "existing" ? "Existing" : "New"}
                      </span>
                    </div>
                    {form.contact_number && form.contact_number !== "00" && (
                      <p className="text-xs text-[#b89890] mt-0.5">{form.contact_number}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetCustomer}
                  className="text-xs text-[#c4a99f] hover:text-[#7a5a50] transition-all px-3 py-2 rounded-xl border border-[#e8d5cc] bg-white hover:border-[#d4b8b0] flex-shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            ) : customerMode === null ? (
              <div>
                <p className="text-sm text-[#b89890] mb-3">Is this customer in the system?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    className="py-5 rounded-2xl border-2 border-[#ecddd6] hover:border-[#c9a96e]/50 hover:bg-[#fdf0ea] active:scale-[0.97] transition-all text-center"
                  >
                    <div className="text-2xl mb-2">👤</div>
                    <div className="text-sm font-semibold text-[#4a3028]">Yes, existing</div>
                    <div className="text-[11px] text-[#c4a99f] mt-0.5">Search database</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("new")}
                    className="py-5 rounded-2xl border-2 border-[#ecddd6] hover:border-[#c9a96e]/50 hover:bg-[#fdf0ea] active:scale-[0.97] transition-all text-center"
                  >
                    <div className="text-2xl mb-2">✨</div>
                    <div className="text-sm font-semibold text-[#4a3028]">No, new</div>
                    <div className="text-[11px] text-[#c4a99f] mt-0.5">Enter manually</div>
                  </button>
                </div>
              </div>
            ) : customerMode === "existing" ? (
              <div>
                <div className="relative mb-3">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4b8b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search by name or phone…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className={inputBase + " pl-10"}
                  />
                </div>
                {customersLoading ? (
                  <div className="text-center py-6 text-[#d4b8b0] text-sm">Loading…</div>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-[#ecddd6] divide-y divide-[#f5e8e2] bg-white">
                    {filteredCustomers.length === 0 ? (
                      <div className="py-6 text-center text-sm text-[#c4a99f]">No customers found</div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#fdf8f5] active:bg-[#fdf0ea] transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#fdf0ea] flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-[#c9a96e]">{c.name?.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-sm text-[#4a3028] font-medium">{c.name}</span>
                          </div>
                          {c.phone && c.phone !== "00" && (
                            <span className="text-xs text-[#c4a99f]">{c.phone}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <button type="button" onClick={() => setCustomerMode(null)} className="mt-3 text-xs text-[#c4a99f] hover:text-[#7a5a50] transition-all flex items-center gap-1">
                  <span>←</span> Back
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#b89890] mb-1.5 font-medium">Full Name *</label>
                  <input name="customer_name" value={form.customer_name} onChange={handleChange} required placeholder="e.g. Maria Santos" className={inputBase} />
                </div>
                <div>
                  <label className="block text-xs text-[#b89890] mb-1.5 font-medium">Contact Number</label>
                  <input name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="e.g. 09XX XXX XXXX" className={inputBase} type="tel" />
                </div>
                <button type="button" onClick={() => setCustomerMode(null)} className="text-xs text-[#c4a99f] hover:text-[#7a5a50] transition-all flex items-center gap-1">
                  <span>←</span> Back
                </button>
              </div>
            )}
          </Section>

          {/* ── STEP 2: Schedule ── */}
          <Section
            number="2"
            title="Date & Time"
            done={step2Done}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#b89890] mb-1.5 font-medium">Date *</label>
                <input
                  name="booking_date"
                  type="date"
                  value={form.booking_date}
                  onChange={handleChange}
                  required
                  className={inputBase + " [color-scheme:light]"}
                />
              </div>
              <div>
                <label className="block text-xs text-[#b89890] mb-1.5 font-medium">Time *</label>
                <input
                  name="booking_time"
                  type="time"
                  value={form.booking_time}
                  onChange={handleChange}
                  required
                  className={inputBase + " [color-scheme:light]"}
                />
              </div>
            </div>
          </Section>

          {/* ── STEP 3: Services ── */}
          <Section
            number="3"
            title="Services"
            done={step3Done}
            badge={selectedServices.length > 0 ? `${selectedServices.length} · ₱${totalPrice.toLocaleString()}` : null}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
          >
            {/* Selected chips */}
            {selectedServices.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-[#fdf0ea] rounded-2xl border border-[#e8d5cc]">
                {selectedServices.map((s) => (
                  <button
                    key={s.instance_id}
                    type="button"
                    onClick={() => removeSelected(s.instance_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e8d5cc] text-[#a07840] rounded-xl text-xs hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 active:scale-[0.97] transition-all"
                  >
                    <span className="font-medium">{s.service_name}</span>
                    {s.option_label !== "Default" && (
                      <span className="text-[#c9a96e]/70">· {s.option_label}</span>
                    )}
                    <span className="text-[#c9a96e] font-semibold">₱{s.option_price?.toLocaleString()}</span>
                    <span className="text-[#ccc] ml-0.5 text-sm leading-none">×</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d4b8b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search services…"
                value={serviceSearch}
                onChange={(e) => {
                  setServiceSearch(e.target.value);
                  setOpenCategory(e.target.value ? "__all__" : null);
                }}
                className={inputBase + " pl-10 pr-8"}
              />
              {serviceSearch && (
                <button
                  type="button"
                  onClick={() => { setServiceSearch(""); setOpenCategory(null); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#e8d5cc] text-[#b89890] hover:bg-[#d4b8b0] hover:text-white flex items-center justify-center text-xs transition-all"
                >
                  ×
                </button>
              )}
            </div>

            {servicesLoading ? (
              <div className="text-center py-10 text-[#d4b8b0] text-sm">Loading services…</div>
            ) : (() => {
              const query = serviceSearch.toLowerCase();
              const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, items]) => {
                const matched = query ? items.filter((s) => s.name.toLowerCase().includes(query)) : items;
                if (matched.length > 0) acc[cat] = matched;
                return acc;
              }, {});
              const entries = Object.entries(filteredGrouped);

              if (entries.length === 0) {
                return (
                  <div className="text-center py-10 text-[#c4a99f] text-sm border border-[#f0ddd5] rounded-2xl">
                    <div className="text-2xl mb-2">🔍</div>
                    No services match "{serviceSearch}"
                  </div>
                );
              }

              return (
                <div className="rounded-2xl border border-[#ecddd6] overflow-hidden bg-white">
                  {entries.map(([category, items], i) => {
                    const instancesInCat = selectedServices.filter((sel) =>
                      items.some((item) => item.id === sel.service_id)
                    ).length;
                    const isOpen = serviceSearch ? true : openCategory === category;

                    return (
                      <div key={category} className={i > 0 ? "border-t border-[#f5e8e2]" : ""}>
                        <button
                          type="button"
                          onClick={() => !serviceSearch && setOpenCategory(openCategory === category ? null : category)}
                          className={`w-full flex items-center justify-between px-4 py-4 transition-all text-left ${!serviceSearch ? "hover:bg-[#fdf8f5] active:bg-[#fdf0ea]" : "cursor-default"}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-[#4a3028]">{category}</span>
                            <span className="text-[10px] text-[#d4b8b0] bg-[#fdf0ea] px-1.5 py-0.5 rounded-md">{items.length}</span>
                            {instancesInCat > 0 && (
                              <span className="text-[10px] bg-[#c9a96e]/15 text-[#a07840] px-2 py-0.5 rounded-full font-semibold">
                                {instancesInCat} ✓
                              </span>
                            )}
                          </div>
                          {!serviceSearch && (
                            <svg className={`w-4 h-4 text-[#d4b8b0] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#fdf8f5] border-t border-[#f5e8e2]">
                            {items.map((service) => {
                              const serviceInstances = selectedServices.filter((s) => s.service_id === service.id);
                              const isSelected = serviceInstances.length > 0;
                              const options = Array.isArray(service.options) ? service.options : [];

                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => handleServiceTap(service)}
                                  className={`px-3 py-3 rounded-xl text-xs text-left transition-all border active:scale-[0.96] ${
                                    isSelected
                                      ? "bg-[#c9a96e]/12 border-[#c9a96e]/40 text-[#a07840]"
                                      : "bg-white border-[#ecddd6] text-[#6a4a42] hover:border-[#c9a96e]/40 hover:bg-[#fdf0ea]"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <span className="font-medium leading-tight">
                                      {isSelected && (
                                        <span className="text-[#c9a96e] mr-1">
                                          {serviceInstances.length > 1 ? `×${serviceInstances.length}` : "✓"}
                                        </span>
                                      )}
                                      {service.name}
                                    </span>
                                    {options.length > 1 && !isSelected && (
                                      <span className="text-[9px] text-[#c4a99f] shrink-0 mt-0.5 bg-[#fdf0ea] px-1 rounded">
                                        {options.length} opts
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-semibold">
                                    {isSelected ? (
                                      <span className="text-[#c9a96e]">
                                        {serviceInstances[serviceInstances.length - 1].option_label !== "Default"
                                          ? serviceInstances[serviceInstances.length - 1].option_label + " · "
                                          : ""}
                                        ₱{serviceInstances[serviceInstances.length - 1].option_price?.toLocaleString()}
                                      </span>
                                    ) : options.length === 1 ? (
                                      <span className="text-[#c4a99f]">₱{options[0].price.toLocaleString()}</span>
                                    ) : null}
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

          {/* ── STEP 4: Notes ── */}
          <Section
            number="4"
            title="Notes"
            optional
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Paste notes from Facebook chat here…"
              className={inputBase + " resize-none"}
            />
          </Section>

        </div>

        {/* ── Sticky Footer ── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-[#ecddd6] px-4 py-4 safe-bottom">
          <div className="max-w-2xl mx-auto">
            {/* Summary row */}
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-[#c4a99f]">
                  {selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""}
                </span>
                <span className="text-sm font-bold text-[#c9a96e]">₱{totalPrice.toLocaleString()}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3.5 rounded-2xl text-sm text-[#b89890] border border-[#ecddd6] bg-white hover:bg-[#fdf8f5] hover:border-[#d4b8b0] transition-all font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-3.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-[#c9a96e] to-[#d4b97e] text-white hover:from-[#d4b97e] hover:to-[#e0c98e] shadow-lg shadow-[#c9a96e]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Reusable Section Card ──────────────────────────────────────────────────
function Section({ number, title, children, done, badge, optional, icon }) {
  return (
    <div className={`bg-white rounded-3xl border overflow-hidden shadow-sm transition-all ${done ? "border-[#e8d5cc]" : "border-[#ecddd6]"}`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${done ? "border-[#f0e0d8] bg-gradient-to-r from-[#fdf8f5] to-white" : "border-[#f5ebe5] bg-white"}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          done
            ? "bg-[#c9a96e] text-white shadow-sm shadow-[#c9a96e]/30"
            : "bg-[#fdf0ea] text-[#d4b8b0] border border-[#ecddd6]"
        }`}>
          {done ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-[11px] font-bold">{number}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-sm font-semibold ${done ? "text-[#4a3028]" : "text-[#7a5a50]"}`}>{title}</span>
          {optional && <span className="text-[10px] text-[#d4b8b0] bg-[#fdf0ea] px-1.5 py-0.5 rounded-md">optional</span>}
          {badge && (
            <span className="text-[10px] bg-[#c9a96e]/12 text-[#a07840] px-2.5 py-1 rounded-full font-bold border border-[#c9a96e]/20 ml-auto flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}