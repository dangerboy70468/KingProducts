import { useLocation, useNavigate } from "react-router-dom";
import { MenuIcon, BellIcon, UserIcon, LogOutIcon } from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
}

interface PathTitles {
  [key: string]: string;
}

export const Header = ({ toggleSidebar }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Convert path to display name
  const getPageTitle = (path: string): string => {
    const titles: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/products": "Product Management",
      "/clients": "Client Management",
      "/orders": "Order Management",
      "/inventory": "Inventory Management",
      "/distribution": "Distribution Management",
      "/attendance": "Attendance Management",
      "/payroll": "Payroll Management",
      "/sales": "Sales Management",
    };
    return titles[path] || "Dashboard";
  };

  const handleLogout = () => {
    // TODO: Add API call to logout
    // await api.post('/auth/logout');
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="bg-[#1551d3] py-4 px-6 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="md:hidden mr-4 text-white hover:text-gray-200"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-white">
          {getPageTitle(location.pathname)}
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-white hover:text-gray-200">
          <BellIcon className="h-6 w-6" />
        </button>
        <div className="relative group">
          <button className="flex items-center text-sm font-medium text-white hover:text-gray-200 p-2">
            <UserIcon className="h-6 w-6 mr-1" />
            <span className="hidden md:inline">Admin</span>
          </button>
          <div
            className="absolute right-0 mt-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 transform"
            style={{
              marginTop: "0.5rem",
              padding: "0.25rem 0",
            }}
          >
            <div className="py-1" role="menu">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                role="menuitem"
              >
                <LogOutIcon className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
