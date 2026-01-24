import Providers from "@/components/Providers";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">{children}</div>
    </Providers>
  );
}
