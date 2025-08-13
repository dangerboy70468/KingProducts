
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  PackageIcon,
  UsersIcon,
  ShoppingCartIcon,
  WarehouseIcon,
  TruckIcon,
  CalendarCheckIcon,
  WalletIcon,
  BarChart3Icon,
  XIcon,
  ClipboardListIcon,
} from "lucide-react";
const navItems = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: LayoutDashboardIcon,
    path: "/dashboard",
  },
  {
    id: "products",
    name: "Products",
    icon: PackageIcon,
    path: "/products",
  },
  {
    id: "clients",
    name: "Clients",
    icon: UsersIcon,
    path: "/clients",
  },
  {
    id: "orders",
    name: "Orders",
    icon: ShoppingCartIcon,
    path: "/orders",
  },
  {
    id: "employees",
    name: "Employees",
    icon: UsersIcon,
    path: "/employees",
  },
  {
    id: "to-produce",
    name: "To Produce",
    icon: ClipboardListIcon,
    path: "/to-produce",
  },
  {
    id: "inventory",
    name: "Inventory",
    icon: WarehouseIcon,
    path: "/inventory",
  },
  {
    id: "distribution",
    name: "Distribution",
    icon: TruckIcon,
    path: "/distribution",
  },
  {
    id: "attendance",
    name: "Attendance",
    icon: CalendarCheckIcon,
    path: "/attendance",
  },
  {
    id: "payroll",
    name: "Payroll",
    icon: WalletIcon,
    path: "/payroll",
  },
  {
    id: "sales",
    name: "Sales",
    icon: BarChart3Icon,
    path: "/sales",
  },
];
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const location = useLocation();
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 bg-gray-800 w-72 lg:w-64 z-50 transition-transform duration-200 ease-in-out h-full flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 border-b border-gray-700 px-4 lg:px-6 shrink-0">
          <div className="flex items-center overflow-hidden">
            <img
              src="/images/kp-logo.png"
              alt="KP Logo"
              className="h-8 w-8 mr-2 flex-shrink-0"
            />
            <h1 className="text-lg lg:text-xl font-bold text-white truncate">
              King Products
            </h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-200 p-1"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-5 px-2 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    className={`flex items-center w-full px-3 py-2.5 text-left rounded-md transition-colors ${
                      location.pathname === item.path
                        ? "bg-gray-700 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};
