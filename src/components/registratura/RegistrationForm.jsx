"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
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
          patientNumber: null,
        });
      } else {
        toast.error("Raqamlar hisoblagichi topilmadi!");
      }
    } catch (error) {
      toast.error("Xatolik yuz berdi!" + error.message);
    }
  };
  const handlePhoneChange = (e) => {
    let value = e.target.value;

    // +998 prefiksini o'chirib tashlashga yo'l qo'ymaslik
    if (!value.startsWith("+998")) {
      value = "+998" + value.replace(/\D/g, "").substring(0, 9);
    }

    // Telefon raqami 14 belgidan oshmasligi uchun
    if (value.length > 14) {
      value = value.substring(0, 14);
    }

    setPatient({ ...patient, phone: value });
  };

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      if (patient.firstName.trim() === "") {
        setSuggestions([]);
        setSuggestionsOpen(false);
        return;
      }

      try {
        const q = query(
          collection(db, "patients"),
          where("firstName", ">=", patient.firstName),
          where("firstName", "<=", patient.firstName + "\uf8ff")
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

    fetchPatients();
  }, [patient.firstName !== ""]);
  
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

  console.log(patient);

  return (
    <div className="p-4 space-y-4">
      <Input
        placeholder="Ism"
        value={patient.firstName}
        onChange={(e) => setPatient({ ...patient, firstName: e.target.value })}
      />
      {suggestionsOpen && suggestions.length > 0 ? (
        <ul className="absolute bg-white border mt-1 w-[400px] max-h-40 overflow-y-auto rounded shadow-lg z-10">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className="p-2 hover:bg-gray-200 cursor-pointer bg-white"
              onClick={() => handleSelectPatient(suggestion)}
            >
              {suggestion.firstName} {suggestion.lastName} - {suggestion.phone}
            </li>
          ))}
        </ul>
      ) : (
        <></>
      )}
      <Input
        placeholder="Familiya"
        value={patient.lastName}
        onChange={(e) => setPatient({ ...patient, lastName: e.target.value })}
      />
      <Input
        type="date"
        value={patient.birthDate}
        onChange={(e) => setPatient({ ...patient, birthDate: e.target.value })}
      />

      <div className="flex gap-3">
        <label>
          <Checkbox
            checked={patient.gender === "Erkak"}
            onClick={() => setPatient({ ...patient, gender: "Erkak" })}
          />
          Erkak
        </label>
        <label>
          <Checkbox
            checked={patient.gender === "Ayol"}
            onClick={() => setPatient({ ...patient, gender: "Ayol" })}
          />
          Ayol
        </label>
      </div>

      <Select
        onValueChange={(value) => setPatient({ ...patient, region: value })}
        defaultValue={patient.region}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Viloyat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Namangan">Namangan</SelectItem>
          <SelectItem value="Uchqo'rg'on">Uchqo'rg'on</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => setPatient({ ...patient, district: value })}
        defaultValue={patient.district}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tuman" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Norin">Norin</SelectItem>
          <SelectItem value="Chortoq">Chortoq</SelectItem>
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) => setPatient({ ...patient, doctor: value })}
        defaultValue={patient.doctor}
      >
        <SelectTrigger className="w-[180px]">{patient.doctor}</SelectTrigger>
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

      <Input
        placeholder="Hudud"
        value={patient.area}
        onChange={(e) => setPatient({ ...patient, area: e.target.value })}
      />
      <Input
        placeholder="Telefon raqami"
        type="number"
        value={patient.phone}
        onChange={handlePhoneChange}
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
        value={patient.discount}
        onChange={handleDiscountChange}
      />

      <Button onClick={handleSubmit}>Bemorni Qo'shish</Button>
    </div>
  );
}
