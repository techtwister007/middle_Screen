import { brand } from "@/config/brand";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin" };

export default function AdminLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-700 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6">
        <p className="font-display text-xl font-extrabold">{brand.name} Admin</p>
        <p className="mb-4 text-sm text-stone-500">{brand.company} internal</p>
        <LoginForm />
      </div>
    </div>
  );
}
