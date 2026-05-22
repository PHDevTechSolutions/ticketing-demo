"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { UserProvider } from "@/contexts/UserContext";
import { FormatProvider } from "@/contexts/FormatContext";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import Image from "next/image";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { type DateRange } from "react-day-picker";

interface UserDetails {
  id: string;
  Firstname: string;
  Lastname: string;
  Email: string;
  Role: string;
  Department: string;
  Status: string;
  ContactNumber: string;
  profilePicture: string;
  Password?: string;
  ContactPassword?: string;
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────

const FL: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[9px] font-mono font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "rgba(249,115,22,0.6)" }}>
    {children}
  </label>
);

const TI: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input
    className={`w-full text-[11px] font-mono px-3 py-1.5 focus:outline-none ${className ?? ""}`}
    style={{ backgroundColor: "#080c10", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(229,229,208,0.8)" }}
    {...props}
  />
);

function SH({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="text-[#f97316] font-mono text-xs">▸</span>
      <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(229,229,208,0.5)" }}>{title}</span>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ProfileClient() {
  const searchParams = useSearchParams();
  const userId = searchParams?.get("id") ?? "";

  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dateCreatedFilterRange, setDateCreatedFilterRangeAction] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (!userId) { setError("User ID missing in URL"); setLoading(false); return; }
    async function fetchUser() {
      try {
        const res = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUserDetails({
          id: data._id || "",
          Firstname: data.Firstname || "",
          Lastname: data.Lastname || "",
          Email: data.Email || "",
          Role: data.Role || "",
          Department: data.Department || "",
          Status: data.Status || "",
          ContactNumber: data.ContactNumber || "",
          profilePicture: data.profilePicture || "",
          Password: "",
          ContactPassword: "",
        });
      } catch (e) {
        console.error(e);
        setError("Error loading user data");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  const calcStrength = (p: string): "weak" | "medium" | "strong" | "" => {
    if (!p) return "";
    if (p.length < 4) return "weak";
    if (/^(?=.*[a-z])(?=.*\d).{6,}$/.test(p)) return "medium";
    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p)) return "strong";
    return "weak";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userDetails) return;
    const { name, value } = e.target;
    setUserDetails({ ...userDetails, [name]: value });
    if (name === "Password") setPasswordStrength(calcStrength(value));
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pass = "";
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  const handleGeneratePassword = () => {
    const p = generatePassword();
    setUserDetails((prev) => prev ? { ...prev, Password: p, ContactPassword: p } : prev);
    setPasswordStrength(calcStrength(p));
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "Xchire");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/image/upload", { method: "POST", body: data });
      const json = await res.json();
      if (json.secure_url) {
        setUserDetails((prev) => prev ? { ...prev, profilePicture: json.secure_url } : prev);
        toast.success("Image uploaded successfully");
      } else {
        toast.error("Failed to upload image");
      }
    } catch (err) {
      toast.error("Error uploading image");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDetails) return;
    if (userDetails.Password && userDetails.Password.length > 10) { toast.error("Password must be at most 10 characters"); return; }
    if (userDetails.Password !== userDetails.ContactPassword) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      const { Password, ContactPassword, id, ...rest } = userDetails;
      const payload = { ...rest, id, ...(Password ? { Password } : {}), profilePicture: userDetails.profilePicture };
      const res = await fetch("/api/profile-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Profile updated successfully");
      setUserDetails((prev) => prev ? { ...prev, Password: "", ContactPassword: "" } : prev);
      setPasswordStrength("");
    } catch (err) {
      console.error(err);
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const strengthColor = passwordStrength === "strong" ? "#22c55e" : passwordStrength === "medium" ? "#eab308" : "#ef4444";

  // ─── loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-2 justify-center min-h-screen" style={{ backgroundColor: "#080c10" }}>
        <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:300ms]" />
        <span className="text-[10px] font-mono text-white/30 ml-1 uppercase tracking-widest">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#080c10" }}>
        <div className="px-4 py-3 font-mono text-[11px] text-[#ef4444]/80" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
          ✕ {error}
        </div>
      </div>
    );
  }

  if (!userDetails) return null;

  return (
    <UserProvider>
      <FormatProvider>
        <SidebarProvider>
          <SidebarLeft />
          <SidebarInset style={{ backgroundColor: "#080c10", minHeight: "100%" }}>

            {/* Header */}
            <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 px-4"
              style={{ backgroundColor: "rgba(8,12,16,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <SidebarTrigger className="text-white/40 hover:text-white/80 hover:bg-white/5" />
              <Separator orientation="vertical" className="h-3.5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-[11px] font-mono text-white/60 uppercase tracking-widest">
                      ▸ Profile
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            {/* Body */}
            <div className="p-6">
              <form onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* ── Left: avatar ── */}
                  <div className="flex flex-col gap-4">
                    <div className="border" style={{ borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="w-1.5 h-1.5 bg-[#f97316]" />
                        <span className="text-[9px] font-mono font-bold text-[#f97316] uppercase tracking-[0.2em]">Avatar</span>
                      </div>
                      <div className="p-4 flex flex-col items-center gap-4">
                        {/* Photo */}
                        <div className="relative w-full aspect-square overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                          {userDetails.profilePicture ? (
                            <Image src={userDetails.profilePicture} alt="Profile" fill className="object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
                              no photo
                            </div>
                          )}
                        </div>
                        {/* Upload */}
                        <input type="file" id="profilePicture" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} disabled={uploading} className="hidden" />
                        <button
                          type="button"
                          onClick={() => document.getElementById("profilePicture")?.click()}
                          disabled={uploading}
                          className="w-full text-[9px] font-mono uppercase tracking-widest px-3 py-2 transition-colors disabled:opacity-40"
                          style={{ border: "1px solid rgba(249,115,22,0.4)", color: "#f97316" }}
                        >
                          {uploading ? "Uploading..." : "[ Change Photo ]"}
                        </button>
                      </div>
                    </div>

                    {/* Read-only info */}
                    <div className="border" style={{ borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="w-1.5 h-1.5 bg-[#06b6d4]" />
                        <span className="text-[9px] font-mono font-bold text-[#06b6d4] uppercase tracking-[0.2em]">Account Info</span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {[
                          { label: "Role",       value: userDetails.Role },
                          { label: "Department", value: userDetails.Department },
                          { label: "Status",     value: userDetails.Status },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-baseline gap-2 text-[10px] font-mono">
                            <span style={{ color: "rgba(249,115,22,0.5)" }}>{label}</span>
                            <span className="flex-1 border-b border-dashed" style={{ borderColor: "rgba(255,255,255,0.05)" }} />
                            <span style={{ color: "rgba(229,229,208,0.6)" }}>{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Right: form fields ── */}
                  <div className="md:col-span-2 flex flex-col gap-5">

                    {/* Name */}
                    <div className="border p-5" style={{ borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <SH title="Name" />
                      <div className="grid grid-cols-2 gap-4">
                        <div><FL htmlFor="Firstname">First Name</FL><TI id="Firstname" name="Firstname" value={userDetails.Firstname} onChange={handleChange} autoComplete="given-name" required /></div>
                        <div><FL htmlFor="Lastname">Last Name</FL><TI id="Lastname" name="Lastname" value={userDetails.Lastname} onChange={handleChange} autoComplete="family-name" required /></div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="border p-5" style={{ borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <SH title="Contact Details" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FL htmlFor="Email">Email Address</FL>
                          <TI id="Email" name="Email" type="email" value={userDetails.Email} onChange={handleChange} autoComplete="email" disabled style={{ backgroundColor: "#080c10", border: "1px solid rgba(255,255,255,0.05)", color: "rgba(229,229,208,0.35)", cursor: "not-allowed" }} />
                        </div>
                        <div><FL htmlFor="ContactNumber">Contact Number</FL><TI id="ContactNumber" name="ContactNumber" value={userDetails.ContactNumber} onChange={handleChange} autoComplete="tel" /></div>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="border p-5" style={{ borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <SH title="Password Credentials" />
                      <div className="space-y-4">
                        {/* New password */}
                        <div>
                          <FL htmlFor="Password">New Password</FL>
                          <div className="flex gap-2">
                            <TI id="Password" name="Password" type={showPassword ? "text" : "password"} value={userDetails.Password || ""} onChange={handleChange} maxLength={10} autoComplete="new-password" className="flex-1" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 shrink-0 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", color: "rgba(229,229,208,0.4)" }}>
                              {showPassword ? "hide" : "show"}
                            </button>
                            <button type="button" onClick={handleGeneratePassword} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 shrink-0 transition-colors" style={{ border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
                              gen
                            </button>
                          </div>
                          {passwordStrength && (
                            <p className="text-[9px] font-mono mt-1.5 uppercase tracking-widest" style={{ color: strengthColor }}>
                              strength: {passwordStrength}
                            </p>
                          )}
                        </div>

                        {/* Confirm password */}
                        <div>
                          <FL htmlFor="ContactPassword">Confirm Password</FL>
                          <div className="flex gap-2">
                            <TI id="ContactPassword" name="ContactPassword" type={showConfirmPassword ? "text" : "password"} value={userDetails.ContactPassword || ""} onChange={handleChange} maxLength={10} autoComplete="new-password" className="flex-1" />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 shrink-0 transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", color: "rgba(229,229,208,0.4)" }}>
                              {showConfirmPassword ? "hide" : "show"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving || uploading}
                        className="text-[9px] font-mono uppercase tracking-widest px-6 py-2.5 transition-colors disabled:opacity-40"
                        style={{ border: "1px solid rgba(249,115,22,0.4)", color: "#f97316", backgroundColor: saving ? "rgba(249,115,22,0.08)" : "transparent" }}
                      >
                        {saving ? "Saving..." : uploading ? "Uploading..." : "[ Save Changes ]"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </SidebarInset>

          <SidebarRight
            userId={userId ?? undefined}
            dateCreatedFilterRange={dateCreatedFilterRange}
            setDateCreatedFilterRangeAction={setDateCreatedFilterRangeAction}
          />
        </SidebarProvider>
      </FormatProvider>
    </UserProvider>
  );
}
