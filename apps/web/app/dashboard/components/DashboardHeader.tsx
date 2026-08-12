import Link from "next/link";
import { MessageSquare, LogOut, Plus } from "lucide-react";
import { User } from "../../../lib/api";

interface DashboardHeaderProps {
  user: User;
  activeTab: "endpoints" | "collections";
  onNewEndpoint: () => void;
  onNewCollection: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  user,
  activeTab,
  onNewEndpoint,
  onNewCollection,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/chat"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-150 font-medium"
        >
          <MessageSquare size={16} className="text-gray-400" />
          <span>Chat</span>
        </Link>

        <div className="w-px h-4 bg-gray-200" />

        {activeTab === "endpoints" ? (
          <button
            onClick={onNewEndpoint}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors shadow-sm"
          >
            + New Endpoint
          </button>
        ) : (
          <button
            onClick={onNewCollection}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} /> New Collection
          </button>
        )}

        <div className="w-px h-4 bg-gray-200" />

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50/50 rounded-lg cursor-pointer transition-all duration-150 font-medium"
        >
          <LogOut size={16} className="text-gray-450" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
