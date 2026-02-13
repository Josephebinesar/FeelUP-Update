import Providers from "@/components/Providers";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {children}
      </div>
    </Providers>
  );
}
