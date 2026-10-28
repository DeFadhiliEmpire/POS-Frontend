import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

//let all tabs render inside <Outlet /> so the sidebar is shared.
export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f3f6f7]">
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[240px] z-20">
        <Sidebar />
      </div>
      {/*mobile responiveness*/}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-[240px]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
          <button
            className="flex-1 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        </div>
      )}
      <div className="lg:pl-[240px] min-h-screen flex flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 lg:px-6 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
