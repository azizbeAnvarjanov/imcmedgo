import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";

const Navbar = () => {
  return (
    <div className="flex items-center justify-between p-2 border-b bg-white h-[10vh]">
      <div className="w-[150px] h-[50px] relative">
        <Link href="/">
          <Image fill src="/logoDark.png" className="object-contain" alt="" />
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-[45px] border gird place-items-center hover:bg-muted h-[45px] text-2xl rounded-xl p-0">
          <FiPlus className="text-2xl" />
        </button>
        <button className="w-[45px] border gird place-items-center hover:bg-muted h-[45px] text-2xl rounded-xl p-0">
          <h2 className="text-xl">A</h2>
        </button>
      </div>
    </div>
  );
};

export default Navbar;
