
import { useState, useRef } from "react";
import { User } from "lucide-react";
import { useAuth } from '../context/Auth';
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const {logout} = useAuth();
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setMenuOpen(false);
    }
  };

  return (
    <nav className="bg-gray-800 p-4 flex justify-end items-center relative" onClick={handleClickOutside}>
      <div ref={menuRef} className="relative">
        <button
          className="relative focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
        >
          <User className="w-6 h-6 text-white" />
        </button>
        {menuOpen && (
          <div className="absolute right-2 top-full mt-2 bg-gray-700 p-2 rounded shadow-lg w-32 max-w-[90vw]">
            <button className="text-gray-300 hover:text-white w-full text-left p-2" onClick={logout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}


