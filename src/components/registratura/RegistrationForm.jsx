"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";

export default function PatientRegistration() {
  const [patient, setPatient] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "erkak",
    region: "namangan",
    district: "norin",
    area: "",
    phone: "",
    discount: 0, // Default chegirma 0%
    totalPrice: 0, // Chegirmaga asoslangan umumiy narx
    paid: 0,
    status: "to'lanmagan",
    services: [],
    doctor: "", // Faqat doctor ID saqlanadi
    visits: 1,
    createdAt: serverTimestamp(),
  });

  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
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

    fetchServices();
    fetchDoctors();
  }, []);

  // Chegirma va xizmatlar o'zgarishiga qarab totalPrice-ni avtomatik yangilash
  useEffect(() => {
    const servicesTotal = patient.services.reduce((sum, s) => sum + s.price, 0);
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
      await addDoc(collection(db, "patients"), patient);
      toast.success("Bemor muvaffaqiyatli qo'shildi!");
    } catch (error) {
      toast.error("Xatolik yuz berdi!");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Input
        placeholder="Ism"
        onChange={(e) => setPatient({ ...patient, firstName: e.target.value })}
      />
      <Input
        placeholder="Familiya"
        onChange={(e) => setPatient({ ...patient, lastName: e.target.value })}
      />
      <Input
        type="date"
        onChange={(e) => setPatient({ ...patient, birthDate: e.target.value })}
      />

      <div className="flex gap-3">
        <label>
          <Checkbox
            checked={patient.gender === "erkak"}
            onClick={() => setPatient({ ...patient, gender: "erkak" })}
          />{" "}
          Erkak
        </label>
        <label>
          <Checkbox
            checked={patient.gender === "ayol"}
            onClick={() => setPatient({ ...patient, gender: "ayol" })}
          />{" "}
          Ayol
        </label>
      </div>

      <Select
        onValueChange={(value) => setPatient({ ...patient, region: value })}
        defaultValue="namangan"
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Viloyat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="namangan">Namangan</SelectItem>
          <SelectItem value="uchqo'rg'on">Uchqo'rg'on</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => setPatient({ ...patient, district: value })}
        defaultValue="norin"
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tuman" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="norin">Norin</SelectItem>
          <SelectItem value="chortoq">Chortoq</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => setPatient({ ...patient, doctor: value })}
      >
        <SelectTrigger className="w-[180px]">Doktorni tanlang</SelectTrigger>
        <SelectContent>
          {doctors.map((doctor) => (
            <SelectItem key={doctor.id} value={doctor.id}>
              {doctor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Hudud"
        onChange={(e) => setPatient({ ...patient, area: e.target.value })}
      />
      <Input
        placeholder="Telefon raqami"
        type="number"
        onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
      />

      <div className="flex gap-3 flex-wrap">
        {services.map((service) => (
          <label key={service.id} className="flex items-center gap-2">
            <Checkbox
              checked={patient.services.includes(service)}
              onClick={() => handleServiceChange(service)}
            />
            {service.name} ({service.price} UZS)
          </label>
        ))}
      </div>

      <div className="text-lg font-semibold">
        Jami Narx: {patient.totalPrice.toFixed(2)} UZS
      </div>

      <Input
        placeholder="Chegirma (%)"
        type="number"
        onChange={handleDiscountChange}
      />

      <Button onClick={handleSubmit}>Bemorni Qo'shish</Button>
    </div>
  );
}
