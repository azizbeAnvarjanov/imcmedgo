"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "../ui/sheet";
import { Input } from "../ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import * as XLSX from "xlsx";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Filter,
  FilterX,
  SheetIcon,
  Trash,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiPlus } from "react-icons/fi";
import { HiOutlineRefresh } from "react-icons/hi";
import { AiOutlineFileExcel } from "react-icons/ai";

export default function KassirPage() {
  const [clients, setClients] = useState([]);
  const [activeFilter, setActiveFilter] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [dateFilter, setDateFilter] = useState({ from: 0, to: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("20"); // Default number of items per page

  console.log(doctors);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "patients"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const clientsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsList);
        setFilteredClients(clientsList);
      }
    );

    fetchDoctors();

    return () => unsubscribe();
  }, []);

  const fetchDoctors = async () => {
    const querySnapshot = await getDocs(collection(db, "doctors"));

    setDoctors(
      querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    );
  };

  const handlePayment = async () => {
    if (!selectedClient || paymentAmount <= 0 || !paymentType) return;

    const newPaid = selectedClient.paid + parseFloat(paymentAmount);
    const newStatus =
      newPaid >= selectedClient.totalPrice ? "To‘langan" : "To‘liq to‘lanmagan";

    await updateDoc(doc(db, "patients", selectedClient.id), {
      paid: newPaid,
      status: newStatus,
    });

    await addDoc(collection(db, "transactions"), {
      patientId: selectedClient.id,
      amount: Number(paymentAmount),
      paymentType,
      date: serverTimestamp(),
    });

    const totalServicePrice = selectedClient.services.reduce(
      (sum, service) => sum + service.price,
      0
    );
    const bonusAmount = totalServicePrice * 0.5;
    const doctorId = selectedClient.doctor;

    await addDoc(collection(db, "bonuses"), {
      doctorId,
      patientId: selectedClient.id,
      amount: bonusAmount,
      date: serverTimestamp(),
    });

    setSelectedClient(null);
    setPaymentAmount(0);
    setPaymentType("");
  };

  const fetchTransactions = async (clientId) => {
    const q = query(
      collection(db, "transactions"),
      where("patientId", "==", clientId)
    );
    const querySnapshot = await getDocs(q);
    const transactionsList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setTransactions(transactionsList);
  };

  const handleFilter = () => {
    setActiveFilter(true);
    let filtered = [...clients];
    if (dateFilter.from && dateFilter.to) {
      filtered = filtered.filter(
        (client) =>
          new Date(client.createdAt.toDate()) >= new Date(dateFilter.from) &&
          new Date(client.createdAt.toDate()) <= new Date(dateFilter.to)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((client) => client.status === statusFilter);
    }
    setFilteredClients(filtered);
  };

  const clearFilters = () => {
    setActiveFilter(false);
    setDateFilter({ from: 0, to: 0 }); // Sanalarni boshlang'ich qiymatga qaytarish
    setStatusFilter(""); // Statusni boshlang'ich qiymatga qaytarish
    setFilteredClients(clients); // Barcha mijozlarni ko'rsatish
  };

  // const handleDelete = async (clientId) => {
  //   await deleteDoc(doc(db, "patients", clientId));
  // };

  const handleDelete = async (clientId) => {
    try {
      const patientRef = doc(db, "patients", clientId);
      const patientSnap = await getDoc(patientRef);

      if (!patientSnap.exists()) {
        console.error("Patient not found!");
        return;
      }

      const patientData = patientSnap.data();
      const collectionDataRef = doc(db, "data", "krYftFb0sR60jyaLQbQs");

      // Agar status "to'lanmagan" bo'lmasa, bonuses va transactions kolleksiyalaridan ham o‘chiramiz
      if (patientData.status !== "to'lanmagan") {
        const collectionsToDelete = ["bonuses", "transactions"];

        for (const collectionName of collectionsToDelete) {
          const collectionRef = collection(db, collectionName);
          const q = query(collectionRef, where("patientId", "==", clientId));
          const snap = await getDocs(q);

          const deletePromises = snap.docs.map((doc) => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        }
      }

      // Patientni o‘chiramiz
      await deleteDoc(patientRef);
      console.log("Patient and related data deleted successfully!");
    } catch (error) {
      console.error("Error deleting patient:", error);
    }
  };
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredClients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients.xlsx");
  };

  const totalSum = filteredClients.reduce(
    (sum, client) => sum + (client.totalPrice || 0),
    0
  );

  const totalPaid = filteredClients.reduce(
    (sum, client) => sum + (client.paid || 0),
    0
  );
  const totalRemaining = totalSum - totalPaid;

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Pagination uchun hisoblash
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e));
    setCurrentPage(1); // Reset to the first page when items per page changes
  };

  console.log(currentData);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            <h1 className="text-xl font-bold">Kassir sahifasi</h1>
            <button className="w-[30px] gird place-items-center h-[30px] text-2xl rounded-sm p-0">
              <HiOutlineRefresh className="text-xl" />
            </button>
          </div>
          <div>
            <Input
              type="date"
              className="bg-white py-5"
              value={dateFilter.from}
              onChange={(e) =>
                setDateFilter((prev) => ({ ...prev, from: e.target.value }))
              }
            />
          </div>
          <div>
            <Input
              type="date"
              className="bg-white py-5"
              value={dateFilter.to}
              onChange={(e) =>
                setDateFilter((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </div>
          {!activeFilter && (
            <Button
              disabled={dateFilter.from | (dateFilter.to === 0) ? true : false}
              onClick={handleFilter}
              className="bg-gradient-to-l from-blue-600 to-green-600"
            >
              <Filter />
            </Button>
          )}
          {activeFilter && (
            <Button onClick={clearFilters} variant="destructive">
              <FilterX />
            </Button>
          )}
        </div>

        <div className="flex items-end gap-3">
          <div className="w-[200px]">
            <Select onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger>
                {statusFilter || "Statusni tanlang"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="To‘langan">To‘langan</SelectItem>
                <SelectItem value="To‘liq to‘lanmagan">
                  To‘liq to‘lanmagan
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={exportToExcel}
            variant="outline"
            className="py-[19px] rounded-lg"
          >
            <AiOutlineFileExcel />
            Excel
          </Button>
        </div>
      </div>

      <div className="mb-1 flex gap-2 text-sm text-left items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <p className="py-1 w-[200px] border-l-[5px] flex items-center pl-2 border-[--blue] font-semibold">
            Jami: {totalSum.toLocaleString()}
          </p>
          <p className="py-1 w-[200px] border-l-[5px] flex items-center pl-2 border-[--green] font-semibold">
            To‘langan: {totalPaid.toLocaleString()}
          </p>
          <p className="py-1 w-[200px] border-l-[5px] flex items-center pl-2 border-[--red] font-semibold">
            To'lanmagan: {totalRemaining.toLocaleString()}
          </p>
          <p className="py-1 w-[200px] font-semibold">
            Bemorlar: {currentData.length}
          </p>
        </div>
        <div className="pr-4 flex items-center gap-4">
          <div className="flex gap-1 items-center">
            <div className="w-[16px] h-[15px] rounded-sm bg-[--green]"></div>
            100% to'lov
          </div>
          <div className="flex gap-1 items-center">
            <div className="w-[16px] h-[15px] rounded-sm bg-[--yellow]"></div>
            Kam to'lov
          </div>
        </div>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="w-[100px]">№</TableCell>
              <TableCell className="w-[300px]">Bemor</TableCell>
              <TableCell className="w-[200px]">Shifokor</TableCell>
              <TableCell>Visits</TableCell>
              <TableCell>Chegirma</TableCell>
              <TableCell>Jami summa</TableCell>
              <TableCell>To'ladi</TableCell>
              <TableCell>Qoldiq</TableCell>
              <TableCell>Yaratilgan sana</TableCell>
              <TableCell className="w-[150px]">Amallar</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Input
                  placeholder="№"
                  className="w-full py-5 rounded-lg placeholder:opacity-50 text-opacity-100 text-black"
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Bemor"
                  className="w-full py-5 rounded-lg placeholder:opacity-50 text-opacity-100 text-black"
                />
              </TableCell>
              <TableCell>
                <Select className="w-full">
                  <SelectTrigger>Shifokor</SelectTrigger>
                  <SelectContent>
                    {doctors?.map((doctor, idx) => (
                      <SelectItem
                        key={idx}
                        value={`${doctor.firstName} ${doctor.lastName}`}
                      >
                        {doctor.firstName} {doctor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((client, idx) => {
              const qoldiq = client.totalPrice - client.paid;
              return (
                <TableRow
                  key={client.id}
                  className={
                    client.status === "To‘langan"
                      ? "bg-[--green]"
                      : client.status === "To‘liq to‘lanmagan"
                      ? "bg-[--yellow]"
                      : "bg-white"
                  }
                >
                  <TableCell>{client.patientNumber}</TableCell>
                  <TableCell>
                    {client.lastName} {client.firstName}
                  </TableCell>
                  <TableCell>{client.doctor}</TableCell>
                  <TableCell>{client.visits || "Noma'lum"}</TableCell>
                  <TableCell>{client.discount}</TableCell>
                  <TableCell>{client.totalPrice?.toLocaleString()}</TableCell>
                  <TableCell>{client.paid?.toLocaleString()}</TableCell>
                  <TableCell>{qoldiq?.toLocaleString()}</TableCell>
                  <TableCell>
                    {client.createdAt?.toDate().toLocaleString() || "Noma'lum"}
                  </TableCell>
                  <TableCell className="">
                    <div className="flex items-center gap-3">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedClient(client);
                              fetchTransactions(client.id);
                            }}
                          >
                            To'lov
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle className="w-full h-20 flex items-center bg-gradient-to-r from-blue-600 to-green-600 text-white text-xl p-7">
                              To‘lov ma'lumotlari
                            </SheetTitle>
                          </SheetHeader>

                          <Tabs defaultValue="details" className="m-6 border">
                            <TabsList>
                              <TabsTrigger value="details">
                                To'lov ma'lumotlari
                              </TabsTrigger>
                              <TabsTrigger value="services">
                                Xizmatlar
                              </TabsTrigger>
                              <TabsTrigger value="transactions">
                                Transaksiyalar tarixi
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="details">
                              <div className="space-y-4 p-5 shadow-lg">
                                <div className="border text-sm">
                                  <div className="grid grid-cols-2">
                                    <div className="border-b px-2 py-1">
                                      Ja'mi summa:
                                    </div>
                                    <div className="border-l border-b px-2 py-1">
                                      {client.totalPrice?.toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2">
                                    <div className="border-b px-2 py-1">
                                      To'landi:
                                    </div>
                                    <div className="border-l border-b px-2 py-1">
                                      {client.paid?.toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2">
                                    <div className=" px-2 py-1">Qoldiq:</div>
                                    <div className="border-l px-2 py-1">
                                      {qoldiq?.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-end gap-5 ">
                                  <div className="flex gap-4">
                                    <div className="space-y-1 w-[200px]">
                                      <label className="block text-sm font-medium">
                                        To‘lov turi{" "}
                                        <strong className="text-red-600">
                                          *
                                        </strong>
                                      </label>
                                      <Select
                                        onValueChange={(value) =>
                                          setPaymentType(value)
                                        }
                                      >
                                        <SelectTrigger>
                                          {paymentType ||
                                            "To‘lov turini tanlang"}
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Naqd">
                                            Naqd
                                          </SelectItem>
                                          <SelectItem value="Plastik">
                                            Plastik
                                          </SelectItem>
                                          <SelectItem value="Bank o‘tkazmasi">
                                            Bank o‘tkazmasi
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="space-y-1 w-[200px]">
                                    <label className="block text-sm font-medium">
                                      To‘lov summasi{" "}
                                      <strong className="text-red-600">
                                        *
                                      </strong>
                                    </label>
                                    <Input
                                      type="number"
                                      value={paymentAmount}
                                      onChange={(e) =>
                                        setPaymentAmount(e.target.value)
                                      }
                                    />
                                  </div>
                                  <Button
                                    onClick={handlePayment}
                                    variant="gomed"
                                    className="px-10"
                                  >
                                    To‘lovni qo'shish
                                  </Button>
                                </div>
                              </div>
                            </TabsContent>
                            <TabsContent value="services">
                              <div className=" grid grid-cols-3 items-center bg-gray-500">
                                <div className="border-r py-2 px-4">№</div>
                                <div className="border-r py-2 px-4">
                                  Xizmat nomi
                                </div>
                                <div className="border-r py-2 px-4">Narxi</div>
                              </div>
                              {client.services?.map((service, idx) => (
                                <div
                                  key={idx}
                                  className="grid grid-cols-3 items-center border-b border-r border-l"
                                >
                                  <div className="py-2 px-4 border-r">
                                    {idx + 1}
                                  </div>
                                  <div className="py-2 px-4 border-r">
                                    {service.name}
                                  </div>
                                  <div className="py-2 px-4 border-r">
                                    {service.price}
                                  </div>
                                </div>
                              ))}
                            </TabsContent>
                            <TabsContent value="transactions">
                              <div className="mt-5 grid grid-cols-4 items-center bg-gray-500">
                                <div className="border-r py-2 px-4">#</div>
                                <div className="border-r py-2 px-4">Summa</div>
                                <div className="border-r py-2 px-4">Sana</div>
                                <div className="border-r py-2 px-4">
                                  To'lov turi
                                </div>
                              </div>
                              <div className="">
                                {transactions.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-4 items-center border-b border-r border-l"
                                  >
                                    <div className="py-2 px-4 border-r">
                                      {idx + 1}
                                    </div>
                                    <div className="py-2 px-4 border-r">
                                      {item.amount?.toLocaleString()}
                                    </div>
                                    <div className="py-2 px-4 border-r">
                                      {item.date?.toDate().toLocaleString()}
                                    </div>
                                    <div className="py-2 px-4 border-r">
                                      {item.paymentType}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </SheetContent>
                      </Sheet>
                      <Button
                        onClick={() => handleDelete(client.id)}
                        variant="destructive"
                        className="w-[35px] h-[35px]"
                      >
                        <Trash />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="w-full flex items-end justify-end mt-3 gap-3">
          <div className="flex gap-2 items-center">
            <Button
              className="w-[45px] h-[45px] rounded-xl"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft />
            </Button>
            {currentPage} / {totalPages}
            <Button
              className="w-[45px] h-[45px] rounded-xl"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight />
            </Button>
          </div>
          <div>
            <Select
              id="itemsPerPage"
              defaultValue={itemsPerPage}
              onValueChange={handleItemsPerPageChange}
              className="p-2 rounded"
            >
              <SelectTrigger className="w-[70px] bg-white focus:outline-none">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="60">60</SelectItem>
                <SelectItem value="70">70</SelectItem>
                <SelectItem value="80">80</SelectItem>
                <SelectItem value="90">90</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="300">300</SelectItem>
                <SelectItem value="400">400</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
