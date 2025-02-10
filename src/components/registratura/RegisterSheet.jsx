"use client";
import React, { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet2";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import {
    addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Input } from "../ui/input";
import { db } from "@/app/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import Image from "next/image";
import toast from "react-hot-toast";

const RegisterSheet = () => {
  const [patient, setPatient] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "Erkak",
    region: "Namangan",
    district: "Norin",
    area: "",
    phone: "",
    discount: 0,
    totalPrice: 0,
    paid: 0,
    status: "To'lanmagan",
    services: [],
    doctor: "Shifokor",
    visits: 1,
    createdAt: serverTimestamp(),
    patientNumber: null,
  });
  const [checkedItems, setCheckedItems] = useState({});
  const [doctors, setDoctors] = useState([]);

  const servicess = [
    {
      id: "1dw",
      name: "Shifokorlar qabuli",
      serviceChilds: [
        {
          id: "122",
          name: "Nurmuhammad Uktamov",
          price: 50000,
        },
        {
          id: "1222",
          name: "Muhamedova Gulnora",
          price: 50000,
        },
        {
          id: "122d",
          name: "Muxtaram Madaliyeva",
          price: 50000,
        },
      ],
    },
    {
      id: "1dw",
      name: "Labaratoriya",
      serviceChilds: [
        {
          id: "32ewdwed",
          name: "Siydik anali",
          price: 18000,
        },
        {
          id: "wewedwedd",
          name: "Kolagramma",
          price: 30000,
        },
        {
          id: "weddedfwce",
          name: "PTI",
          price: 25000,
        },
      ],
    },
  ];

  const [services, setServices] = useState([]);
  const [pNumber, setPNUmber] = useState(null);

  useEffect(() => {
    const fetchPNUmber = async () => {
      const counterRef = doc(db, "data", "krYftFb0sR60jyaLQbQs");
      const counterSnap = await getDoc(counterRef);
      if (counterSnap.exists()) {
        const currentNumber = counterSnap.data().patientNumber;
        const newPatientNumber = Number(currentNumber) + 1;
        setPNUmber(newPatientNumber);
        setPatient({ ...patient, patientNumber: newPatientNumber });
      }
    };
    const fetchServices = async () => {
      const querySnapshot = await getDocs(collection(db, "services"));
      setServices(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    const fetchDoctors = async () => {
      const querySnapshot = await getDocs(collection(db, "doctors"));
      setDoctors(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    fetchPNUmber();
    fetchServices();
    fetchDoctors();
  }, []);
  console.log(pNumber);

  const handleCheckedChange = (id) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id], // Belgilangan bo'lsa, bekor qiladi; belgilanmagan bo'lsa, belgilaydi
    }));
  };

  useEffect(() => {
    const servicesTotal = patient.services.reduce((sum, s) => sum + s.price, 0);
    console.log(servicesTotal);
    const discountedPrice =
      servicesTotal - (servicesTotal * patient.discount) / 100;
    setPatient((prev) => ({ ...prev, totalPrice: discountedPrice }));
  }, [patient.services, patient.discount]);

  const handleServiceChange = (service) => {
    const updatedServices = patient.services.includes(service)
      ? patient.services.filter((s) => s.id !== service.id)
      : [...patient.services, service];

    setPatient({ ...patient, services: updatedServices });
  };

  const handleDiscountChange = (e) => {
    const discount = parseFloat(e.target.value) || 0;
    if (discount < 0 || discount > 100) {
      toast.error("Chegirma 0% dan 100% gacha bo'lishi kerak!");
      return;
    }
    setPatient({ ...patient, discount });
  };

  const handleSubmit = async () => {
    try {
      const counterRef = doc(db, "data", "krYftFb0sR60jyaLQbQs");
      const counterSnap = await getDoc(counterRef);

      if (counterSnap.exists()) {
        const currentNumber = counterSnap.data().patientNumber;
        const newPatientNumber = Number(currentNumber) + 1;

        await addDoc(collection(db, "patients"), {
          ...patient,
          patientNumber: newPatientNumber,
        });

        await updateDoc(counterRef, { patientNumber: newPatientNumber });

        toast.success(
          `Bemor muvaffaqiyatli qo'shildi! Raqam: ${newPatientNumber}`
        );


      } else {
        toast.error("Raqamlar hisoblagichi topilmadi!");
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi!" + error.message);
    }
  };

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const fetchPatients = async (value) => {
    if (value.trim() === "") {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    try {
      const q = query(
        collection(db, "patients"),
        where("firstName", ">=", value),
        where("firstName", "<=", value + "\uf8ff")
      );
      const querySnapshot = await getDocs(q);

      // Duplicatlarni filtrlash uchun Map ishlatiladi
      const uniquePatients = new Map();
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const fullName = `${data.firstName} ${data.lastName}`;
        if (!uniquePatients.has(fullName)) {
          uniquePatients.set(fullName, { id: doc.id, ...data });
        }
      });

      setSuggestions(Array.from(uniquePatients.values()));
      setSuggestionsOpen(true);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  // Tanlangan bemor ma'lumotlarini olish va inputlarga to'ldirish
  const handleSelectPatient = async (selectedPatient) => {
    try {
      const patientRef = doc(db, "patients", selectedPatient.id);
      const patientDoc = await getDoc(patientRef);
      if (patientDoc.exists()) {
        const patientData = patientDoc.data();
        setPatient({
          ...patient,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          birthDate: patientData.birthDate || "",
          gender: patientData.gender || "",
          region: patientData.region || "",
          district: patientData.district || "",
          area: patientData.area || "",
          phone: patientData.phone || "",
          visits: patientData.visits + 1 || "",
        });
        setSuggestionsOpen(false);
      }
    } catch (error) {
      console.error("Error fetching patient details:", error);
    }
    setSuggestions([]);
    // Tanlangandan keyin suggestionsni yopish
  };

  const clearValue = () => {
    setCheckedItems({});
    setPatient({
      firstName: "",
      lastName: "",
      birthDate: "",
      gender: "Erkak",
      region: "Namangan",
      district: "Norin",
      area: "",
      phone: "",
      discount: 0,
      totalPrice: 0,
      paid: 0,
      status: "To'lanmagan",
      services: [],
      doctor: "Shifokor",
      visits: 1,
      createdAt: serverTimestamp(),
      patientNumber: pNumber,
    });
  };
  const handlePrint = () => {
    window.print();
  };
  console.log(patient);
  return (
    <Sheet>
      <SheetTrigger className="w-[45px] border gird place-items-center hover:bg-muted h-[45px] text-2xl rounded-xl p-0">
        <FiPlus className="text-2xl" />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="w-full h-20 flex items-center bg-gradient-to-r from-blue-600 to-green-600 text-white text-xl p-7 justify-between">
            Yangi bemor
            <div className="-translate-x-24 flex items-center gap-5">
              <Button
                className=" rounded-lg mb-1 font-bold"
                variant="destructive"
                onClick={clearValue}
              >
                Clear
              </Button>
              <Button
                className="rounded-lg mb-1 font-bold"
                onClick={handleSubmit}
              >
                Saqlash
              </Button>
              <Button
                className="rounded-lg mb-1 font-bold"
                onClick={handlePrint}
              >
                Print
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="p-2 flex bg-red-200">
          <div className="receipt w-[80mm] border h-[90vh] bg-white p-2 ">
            <div className="mx-auto w-[100px] h-[100px]  relative">
              <Image fill alt="imc logo" src="/imc.png" />
            </div>
            <h1 className="text-center font-bold">
              {patient.firstName} {patient.lastName}
            </h1>
            <h1 className="text-center font-bold">
              ID: {patient.patientNumber}
            </h1>
            <h1 className="text-center font-bold">+998{patient.phone}</h1>
            <hr />
            <div className="py-4">
              {patient.services.map((service, idx) => (
                <div
                  key={idx}
                  className="p-1 flex items-center justify-between"
                >
                  <div>
                    {idx + 1}. {service.name}
                  </div>
                  <div>{service.price?.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <p className="flex items-center justify-between">
              <strong>Chegirma:</strong> {patient.discount?.toLocaleString()} %
            </p>
            <p className="flex items-center justify-between">
              <strong>Jami Narx:</strong> {patient.totalPrice?.toLocaleString()}{" "}
              UZS
            </p>
          </div>
          <div className="w-[50%] border h-[90vh] bg-white p-5 space-y-4">
            <div className="relative">
              <Input
                placeholder="Ism"
                onChange={(e) => fetchPatients(e.target.value)}
              />
              {suggestionsOpen && suggestions.length > 0 ? (
                <ul className="absolute bg-white border top-full w-[400px] max-h-40 overflow-y-auto rounded shadow-lg z-10">
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion.id}
                      className="p-2 hover:bg-gray-200 cursor-pointer bg-white"
                      onClick={() => handleSelectPatient(suggestion)}
                    >
                      {suggestion.firstName} {suggestion.lastName} -{" "}
                      {suggestion.phone}
                    </li>
                  ))}
                </ul>
              ) : (
                <></>
              )}
            </div>
            <div className="grid grid-cols-3 items-center gap-10 relative">
              <Input
                placeholder="Ism"
                value={patient.firstName}
                onChange={(e) =>
                  setPatient({ ...patient, firstName: e.target.value })
                }
              />
              <Input
                placeholder="Familiya"
                value={patient.lastName}
                onChange={(e) =>
                  setPatient({ ...patient, lastName: e.target.value })
                }
              />
              <div className="flex items-center">
                <div className="h-full py-[5px] border px-3 rounded-l-md">
                  +998
                </div>
                <Input
                  placeholder="Telefon raqami"
                  type="number"
                  className="!rounded-l-none border-l-0"
                  value={patient.phone}
                  onChange={(e) =>
                    setPatient({ ...patient, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Input
                type="date"
                value={patient.birthDate}
                onChange={(e) =>
                  setPatient({ ...patient, birthDate: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="border py-[6px] px-3 rounded-md flex items-center gap-3">
                  <Checkbox
                    checked={patient.gender === "Erkak"}
                    onClick={() => setPatient({ ...patient, gender: "Erkak" })}
                  />
                  Erkak
                </label>
                <label className="border py-[6px] px-3 rounded-md flex items-center gap-3">
                  <Checkbox
                    checked={patient.gender === "Ayol"}
                    onClick={() => setPatient({ ...patient, gender: "Ayol" })}
                  />
                  Ayol
                </label>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select
                onValueChange={(value) =>
                  setPatient({ ...patient, region: value })
                }
                defaultValue={patient.region}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Viloyat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Namangan">Namangan</SelectItem>
                  <SelectItem value="Uchqo'rg'on">Uchqo'rg'on</SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value) =>
                  setPatient({ ...patient, district: value })
                }
                defaultValue={patient.district}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tuman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Norin">Norin</SelectItem>
                  <SelectItem value="Chortoq">Chortoq</SelectItem>
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) =>
                  setPatient({ ...patient, doctor: value })
                }
                defaultValue={patient.doctor}
              >
                <SelectTrigger>{patient.doctor}</SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor, idx) => (
                    <SelectItem
                      key={idx}
                      value={`${doctor.firstName} ${doctor.lastName}`}
                    >
                      {doctor.firstName} {doctor.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label>Chegirma</label>
            <Input
              placeholder="Chegirma (%)"
              type="number"
              className="w-[200px]"
              value={patient.discount}
              onChange={handleDiscountChange}
            />
            <div className="text-lg font-semibold">
              Jami Narx: {patient.totalPrice?.toLocaleString()} UZS
            </div>
            <div>
              {patient.services.map((item, idx) => (
                <div key={idx}>{item.name}</div>
              ))}
            </div>
          </div>
          <div className="w-[30%] border h-[90vh] bg-white">
            <div className="flex items-center justify-start p-5 bg-gradient-to-r from-blue-600 to-green-600 text-white text-xl">
              Xizmatlar
            </div>
            <div className="p-4">
              <Accordion type="single" collapsible>
                {services.map((service, idx) => (
                  <AccordionItem key={idx + 1} value={`item-${idx + 1}`}>
                    <AccordionTrigger>{service.name}</AccordionTrigger>
                    <AccordionContent className="">
                      {service.serviceChilds.map((option, idx) => (
                        <label
                          key={idx}
                          className={`border mb-1 w-full flex items-center gap-3 p-2 cursor-pointer justify-between  ${
                            checkedItems[option.id]
                              ? "bg-gradient-to-r from-blue-500 to-green-500 text-white"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex gap-3 items-center">
                            <Checkbox
                              checked={!!checkedItems[option.id]}
                              onCheckedChange={() =>
                                handleCheckedChange(option.id)
                              }
                              onClick={() => handleServiceChange(option)}
                            />
                            {option.name}
                          </div>
                          {option.price?.toLocaleString()}
                        </label>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RegisterSheet;
