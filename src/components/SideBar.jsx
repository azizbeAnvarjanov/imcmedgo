import Link from "next/link";
import React from "react";
import { IoArrowForward } from "react-icons/io5";
import { ClipboardPlus, Presentation, WalletCards } from "lucide-react";

const SideBar = () => {
  return (
    <div className="w-[15vh] h-screen bg-white fixed left-0  p-2 z-50 border-r">
      <div className="w-full py-3 cursor-pointer hover:bg-[#e3f1ff] rounded-md text-sm flex items-center justify-center flex-col text-center font-bold relative">
        <Presentation size={24} strokeWidth={1.5} className="mb-1" />
        Dashboard
      </div>
      <div className="w-full py-3 cursor-pointer hover:bg-[#e3f1ff] rounded-md text-sm flex items-center justify-center flex-col text-center font-bold relative">
        <ClipboardPlus size={24} strokeWidth={1.5} className="mb-1" />
        Bemorlar
      </div>
      <div className="kassa w-full py-3 cursor-pointer hover:bg-[#e3f1ff] rounded-md text-sm flex items-center justify-center flex-col text-center font-bold relative">
        <WalletCards className="mb-1" size={24} strokeWidth={1.5} />
        Kassa
      </div>
      <ul className="kassa-ul absolute h-screen bg-white w-[500px] z-50 top-0 transition-all p-5 shadow-xl">
        <li>
          <Link
            href="#"
            className="py-2 px-5 flex rounded-lg items-center justify-between hover:bg-gradient-to-l from-blue-100 to-green-100 bg-opacity-40"
          >
            Item 1 <IoArrowForward />
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default SideBar;
