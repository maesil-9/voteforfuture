import { redirect } from "next/navigation";

export default function AdminElectionsPage() {
  // 선거 목록은 대시보드에 통합되어 있다
  redirect("/admin");
}
